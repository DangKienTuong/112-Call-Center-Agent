const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Download Roboto font for Vietnamese PDF support
 */
async function downloadFont() {
  const fontsDir = path.join(__dirname, '../fonts');
  const fontPath = path.join(fontsDir, 'Roboto-Regular.ttf');

  // Check if font already exists
  if (fs.existsSync(fontPath)) {
    console.log('Roboto font already exists at:', fontPath);
    return;
  }

  // Ensure fonts directory exists
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }

  console.log('Downloading Roboto font...');

  const url = 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf';

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return https.get(response.headers.location, (redirectResponse) => {
          const fileStream = fs.createWriteStream(fontPath);
          redirectResponse.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            console.log('Roboto font downloaded successfully to:', fontPath);
            resolve();
          });

          fileStream.on('error', (err) => {
            fs.unlinkSync(fontPath);
            reject(err);
          });
        });
      }

      const fileStream = fs.createWriteStream(fontPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log('Roboto font downloaded successfully to:', fontPath);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlinkSync(fontPath);
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Run if called directly
if (require.main === module) {
  downloadFont()
    .then(() => {
      console.log('Font download complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to download font:', err);
      console.log('\nAlternative: Download Roboto-Regular.ttf manually from:');
      console.log('https://fonts.google.com/specimen/Roboto');
      console.log('and place it in backend/fonts/ directory');
      process.exit(1);
    });
}

module.exports = downloadFont;

