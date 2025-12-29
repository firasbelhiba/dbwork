const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BRAND_COLOR = '#3730a3'; // Indigo-800 - matches your primary color

async function generateIcons() {
  console.log('Generating PWA icons...');

  // Read the original logo
  const logoPath = path.join(PUBLIC_DIR, 'logo-icon-white.png');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found:', logoPath);
    process.exit(1);
  }

  // Get logo metadata
  const logoMeta = await sharp(logoPath).metadata();
  console.log('Original logo size:', logoMeta.width, 'x', logoMeta.height);

  // Generate icons with proper padding and background
  const sizes = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 32, name: 'favicon-32.png' },
    { size: 16, name: 'favicon-16.png' },
  ];

  for (const { size, name } of sizes) {
    // Calculate logo size with 20% padding on each side (40% total)
    // This leaves 60% for the logo
    const logoSize = Math.round(size * 0.6);
    const padding = Math.round((size - logoSize) / 2);

    // Resize the logo
    const resizedLogo = await sharp(logoPath)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Create the final icon with background color and centered logo
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_COLOR
      }
    })
      .composite([
        {
          input: resizedLogo,
          top: padding,
          left: padding
        }
      ])
      .png()
      .toFile(path.join(PUBLIC_DIR, name));

    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Also update favicon.png
  await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: BRAND_COLOR
    }
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(20, 20, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        top: 6,
        left: 6
      }
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'));

  console.log('Generated favicon.png (32x32)');

  console.log('\nAll PWA icons generated successfully!');
  console.log('Icons are using brand color:', BRAND_COLOR);
}

generateIcons().catch(console.error);
