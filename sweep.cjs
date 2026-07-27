const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove shadow-neu-inner and replace with thick border and flat background
  // Often shadow-neu-inner is used with bg-neu-bg. Let's just remove it and add border-4 border-[#059669]
  content = content.replace(/shadow-neu-inner/g, 'border-4 border-[#059669] bg-white');

  // 2. Remove soft borders
  content = content.replace(/border-white\/(30|40|50|60)/g, 'border-4 border-[#059669]');
  content = content.replace(/border-gray-300/g, 'border-4 border-[#059669]');
  
  // 3. Remove rounded corners (except maybe rounded-full for circles, but let's make everything sharp for true maximalism)
  content = content.replace(/rounded-(2xl|xl|lg|md|sm)/g, 'rounded-none');
  
  // For rounded-full, if it's an icon container, sometimes a sharp box looks better in maximalism.
  content = content.replace(/rounded-full/g, 'rounded-none');

  // 4. Upgrade font weights to make it bolder
  content = content.replace(/font-medium/g, 'font-bold');
  
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
console.log("Deep sweep complete!");
