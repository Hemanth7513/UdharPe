const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove shadow-neu-inner and replace with sharp borders
  content = content.replace(/shadow-neu-inner/g, 'border-4 border-black shadow-none bg-white');

  // 2. Remove soft borders and replace with stark black
  content = content.replace(/border-white\/(30|40|50|60)/g, 'border-4 border-black');
  content = content.replace(/border-gray-300/g, 'border-4 border-black');
  
  // 3. Remove rounded corners to give it that brutalist block feel
  content = content.replace(/rounded-(2xl|xl|lg|md|sm)/g, 'rounded-none');
  content = content.replace(/rounded-full/g, 'rounded-none');

  // 4. Make all text super heavy
  content = content.replace(/font-medium/g, 'font-bold');
  
  // 5. Some elements need explicit bg-white if they were transparent
  // Just in case, though bg-white is often already there.

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function traverseDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  });
}

traverseDir(srcDir);
console.log("Professional Neo-Brutalist sweep complete!");
