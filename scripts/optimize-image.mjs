import sharp from "sharp";

const src = "public/hero.png";

// Small grayscale image for canvas particle sampling — tiny download, fast to read.
await sharp(src)
  .resize({ width: 680, withoutEnlargement: true })
  .grayscale()
  .normalise()
  .png({ quality: 80, compressionLevel: 9 })
  .toFile("public/hero-sample.png");

// Optimized social/OG image — reasonable dimensions, far smaller than the 5.7MB original.
await sharp(src)
  .resize({ width: 1200, height: 800, fit: "cover" })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("public/og.jpg");

const meta = await sharp("public/hero-sample.png").metadata();
console.log(`hero-sample.png -> ${meta.width}x${meta.height}`);
console.log("done");
