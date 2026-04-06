import Foundation
import AVFoundation

func argumentValue(_ name: String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of: name), CommandLine.arguments.indices.contains(index + 1) else {
        return nil
    }
    return CommandLine.arguments[index + 1]
}

final class SegmentingRecorder {
    private let engine = AVAudioEngine()
    private let writeQueue = DispatchQueue(label: "voice-prompt.recorder.write")
    private let stopSemaphore = DispatchSemaphore(value: 0)

    private let outputURL: URL
    private let controlPath: String?
    private let segmentsDirectory: URL
    private let targetFormat: AVAudioFormat
    private let segmentFrameLimit: AVAudioFramePosition

    private var converter: AVAudioConverter?
    private var mainFile: AVAudioFile?
    private var segmentFile: AVAudioFile?
    private var segmentFileURL: URL?
    private var segmentIndex = 0
    private var segmentFrames: AVAudioFramePosition = 0
    private var stopped = false

    init(outputURL: URL, controlPath: String?, segmentsDirectory: URL, segmentMilliseconds: Int) throws {
        self.outputURL = outputURL
        self.controlPath = controlPath
        self.segmentsDirectory = segmentsDirectory
        self.targetFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16_000, channels: 1, interleaved: false)!
        self.segmentFrameLimit = AVAudioFramePosition((Double(segmentMilliseconds) / 1000.0) * self.targetFormat.sampleRate)

        try? FileManager.default.removeItem(at: outputURL)
        try? FileManager.default.removeItem(at: segmentsDirectory)
        try FileManager.default.createDirectory(at: segmentsDirectory, withIntermediateDirectories: true)
        self.mainFile = try AVAudioFile(forWriting: outputURL, settings: targetFormat.settings, commonFormat: targetFormat.commonFormat, interleaved: targetFormat.isInterleaved)
    }

    func start(duration: Int?) throws {
        guard let device = AVCaptureDevice.default(for: .audio) else {
            throw NSError(domain: "VoicePrompt", code: 1, userInfo: [NSLocalizedDescriptionKey: "No audio input device available."])
        }

        let inputNode = engine.inputNode
        let inputFormat = inputNode.inputFormat(forBus: 0)
        converter = AVAudioConverter(from: inputFormat, to: targetFormat)

        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 2048, format: inputFormat) { [weak self] buffer, _ in
            self?.handle(buffer: buffer)
        }

        engine.prepare()
        try engine.start()

        print("RECORDING_STARTED:\(device.localizedName)")
        fflush(stdout)

        if let duration {
            DispatchQueue.global().asyncAfter(deadline: .now() + .seconds(duration)) { [weak self] in
                self?.stop()
            }
        } else if let controlPath {
            let timer = DispatchSource.makeTimerSource(queue: DispatchQueue.global())
            timer.schedule(deadline: .now() + .milliseconds(200), repeating: .milliseconds(200))
            timer.setEventHandler { [weak self] in
                if FileManager.default.fileExists(atPath: controlPath) {
                    timer.cancel()
                    self?.stop()
                }
            }
            timer.resume()
        } else {
            throw NSError(domain: "VoicePrompt", code: 2, userInfo: [NSLocalizedDescriptionKey: "Either --duration or --control must be provided."])
        }

        _ = stopSemaphore.wait(timeout: .distantFuture)
    }

    private func handle(buffer: AVAudioPCMBuffer) {
        guard let converter else { return }
        guard let converted = convert(buffer: buffer, with: converter) else { return }

        writeQueue.sync {
            guard !stopped else { return }

            do {
                try mainFile?.write(from: converted)
                try ensureSegmentFile()
                try segmentFile?.write(from: converted)
                segmentFrames += AVAudioFramePosition(converted.frameLength)

                if segmentFrames >= segmentFrameLimit {
                    finalizeCurrentSegment()
                }
            } catch {
                fputs("Recorder write error: \(error.localizedDescription)\n", stderr)
            }
        }
    }

    private func convert(buffer: AVAudioPCMBuffer, with converter: AVAudioConverter) -> AVAudioPCMBuffer? {
        let ratio = targetFormat.sampleRate / buffer.format.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 32
        guard let converted = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: outputFrameCapacity) else {
            return nil
        }

        var error: NSError?
        var used = false
        let status = converter.convert(to: converted, error: &error) { _, outStatus in
            if used {
                outStatus.pointee = .noDataNow
                return nil
            }

            used = true
            outStatus.pointee = .haveData
            return buffer
        }

        guard error == nil, status != .error else {
            return nil
        }

        return converted.frameLength > 0 ? converted : nil
    }

    private func ensureSegmentFile() throws {
        if segmentFile != nil {
            return
        }

        let fileURL = segmentsDirectory.appendingPathComponent(String(format: "segment-%04d.wav", segmentIndex))
        try? FileManager.default.removeItem(at: fileURL)
        segmentFileURL = fileURL
        segmentFile = try AVAudioFile(forWriting: fileURL, settings: targetFormat.settings, commonFormat: targetFormat.commonFormat, interleaved: targetFormat.isInterleaved)
        segmentFrames = 0
    }

    private func finalizeCurrentSegment() {
        guard let fileURL = segmentFileURL, segmentFrames > 0 else {
            segmentFile = nil
            segmentFileURL = nil
            segmentFrames = 0
            return
        }

        segmentFile = nil
        segmentFileURL = nil
        segmentFrames = 0
        print("SEGMENT_READY:\(fileURL.path)")
        fflush(stdout)
        segmentIndex += 1
    }

    func stop() {
        writeQueue.sync {
            guard !stopped else { return }
            stopped = true

            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
            finalizeCurrentSegment()
            mainFile = nil
            print("RECORDING_SAVED:\(outputURL.path)")
            fflush(stdout)
            stopSemaphore.signal()
        }
    }
}

let duration = argumentValue("--duration").flatMap(Int.init)
let outputPath = argumentValue("--output") ?? "/tmp/voice-prompt-input.wav"
let controlPath = argumentValue("--control")
let segmentMilliseconds = argumentValue("--segment-ms").flatMap(Int.init) ?? 1800
let segmentsPath = argumentValue("--segments-dir") ?? "/tmp/voice-prompt-segments"

do {
    let recorder = try SegmentingRecorder(
        outputURL: URL(fileURLWithPath: outputPath),
        controlPath: controlPath,
        segmentsDirectory: URL(fileURLWithPath: segmentsPath, isDirectory: true),
        segmentMilliseconds: segmentMilliseconds,
    )
    try recorder.start(duration: duration)
} catch {
    fputs("\(error.localizedDescription)\n", stderr)
    exit(1)
}
