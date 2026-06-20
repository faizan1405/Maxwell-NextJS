const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/maxwell-products.json');
let data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Mappings for sizes
const sizeMappings = {
  '100ml': '5L',
  '300ml': '5L',
  '500ml': '5L',
  '750ml': '5L',
  '1L': '25L',
  '200g': '5kg',
  '500g': '5kg',
  '1kg': '25kg'
};

const regexReplacements = [
  { regex: /bottle/gi, replace: 'drum' },
  { regex: /trigger spray/gi, replace: 'bulk drum' },
  { regex: /bottles/gi, replace: 'drums' },
  { regex: /premium drum design/gi, replace: 'industrial drum design' },
  { regex: /retail stores/gi, replace: 'manufacturing plants' },
  { regex: /retail/gi, replace: 'industrial' },
  { regex: /consumer/gi, replace: 'commercial' }
];

data.forEach(p => {
  // Update base size
  if (sizeMappings[p.size]) {
    p.size = sizeMappings[p.size];
  }

  // Update variants if any exist
  if (p.variants && p.variants.length > 0) {
    p.variants.forEach(v => {
      // Some variants are sizes
      if (sizeMappings[v.name]) {
        v.name = sizeMappings[v.name];
        // Bump price as well slightly to reflect bulk if needed
        v.price = v.price * 5; 
      }
    });
    
    // Remove duplicate variants with same name (if any got merged)
    const uniqueVariants = [];
    const seen = new Set();
    p.variants.forEach(v => {
      if (!seen.has(v.name)) {
        seen.add(v.name);
        uniqueVariants.push(v);
      }
    });
    p.variants = uniqueVariants;
  }

  // Update descriptions
  if (p.desc) {
    regexReplacements.forEach(r => {
      p.desc = p.desc.replace(r.regex, r.replace);
    });
  }

  // Update benefits
  if (p.benefits && p.benefits.length > 0) {
    p.benefits = p.benefits.map(b => {
      let text = b;
      regexReplacements.forEach(r => {
        text = text.replace(r.regex, r.replace);
      });
      return text;
    });
  }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully updated maxwell-products.json');
