// Apple Vision OCR of page images into Tesseract-format TSV (level-1 page row,
// level-5 word rows), so rhemes.ocrdiff reads it like a .tess.tsv.
//   swiftc -O -o vision_ocr scripts/wikisource/rhemes/vision_ocr.swift; ./vision_ocr OUT_SUFFIX IMAGE...
// writes IMAGE minus extension + OUT_SUFFIX (e.g. ".vision.tsv") beside each image.
// Language correction is off: the print's spellings must not be "fixed".
import AppKit
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: vision_ocr OUT_SUFFIX IMAGE...\n".data(using: .utf8)!)
    exit(2)
}
let suffix = args[1]

for path in args[2...] {
    let url = URL(fileURLWithPath: path)
    guard let img = NSImage(contentsOf: url),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!)
        continue
    }
    let W = cg.width, H = cg.height
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.recognitionLanguages = ["en-US"]
    try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    var out = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n"
    out += "1\t1\t0\t0\t0\t0\t0\t0\t\(W)\t\(H)\t-1\t\n"
    func px(_ r: CGRect) -> (Int, Int, Int, Int) {
        (Int(r.minX * CGFloat(W)), Int((1 - r.maxY) * CGFloat(H)),
         Int(r.width * CGFloat(W)), Int(r.height * CGFloat(H)))
    }
    for (li, obs) in (req.results ?? []).enumerated() {
        guard let cand = obs.topCandidates(1).first else { continue }
        let s = cand.string
        var wn = 0
        // split on spaces (keeps punctuation with its word, as Tesseract does)
        var idx = s.startIndex
        while idx < s.endIndex {
            while idx < s.endIndex && s[idx] == " " { idx = s.index(after: idx) }
            guard idx < s.endIndex else { break }
            var end = idx
            while end < s.endIndex && s[end] != " " { end = s.index(after: end) }
            let word = String(s[idx..<end])
            if let box = try? cand.boundingBox(for: idx..<end)?.boundingBox {
                let (l, t, w, h) = px(box)
                wn += 1
                out += "5\t1\t\(li + 1)\t1\t1\t\(wn)\t\(l)\t\(t)\t\(w)\t\(h)\t\(Int(cand.confidence * 100))\t\(word)\n"
            }
            idx = end
        }
    }
    let dest = url.deletingPathExtension().path + suffix
    try out.write(toFile: dest, atomically: true, encoding: .utf8)
    print(dest)
}
