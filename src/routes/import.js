const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET XML Import Page
router.get('/', isAuthenticated, (req, res) => {
  res.render('import', { result: null, importedStudents: [], error: null });
});

// POST Upload & Process XML File
// VULNERABILITY: XML External Entity (XXE) Injection
// Parsed using libxmljs2 with { noent: true } which expands external entities (file disclosure / SSRF)
router.post('/xml', isAuthenticated, upload.single('xmlfile'), async (req, res) => {
  if (!req.file && !req.body.xml_text) {
    return res.render('import', { result: null, importedStudents: [], error: 'Please upload an XML file or paste XML markup.' });
  }

  const xmlContent = req.file ? req.file.buffer.toString('utf8') : req.body.xml_text;

  try {
    let importedStudents = [];
    let parsedXmlStr = '';

    // XXE Processing logic with Entity resolution
    let processedXml = xmlContent;

    // Check for XML External Entity (XXE) definitions in DOCTYPE header
    const entityRegex = /<!ENTITY\s+(\w+)\s+SYSTEM\s+["']([^"']+)["']\s*>/gi;
    let match;
    const fs = require('fs');

    while ((match = entityRegex.exec(xmlContent)) !== null) {
      const entityName = match[1];
      let sysPath = match[2].replace(/^file:\/\/\/?/, '');

      try {
        // Resolve system file path for XXE payload
        if (fs.existsSync(sysPath)) {
          const fileContent = fs.readFileSync(sysPath, 'utf8');
          processedXml = processedXml.replace(new RegExp(`&${entityName};`, 'g'), fileContent);
        } else {
          // Attempt standard Linux path resolution if on Windows lab
          const winFallback = sysPath.replace(/^\//, '');
          if (fs.existsSync(winFallback)) {
            const fileContent = fs.readFileSync(winFallback, 'utf8');
            processedXml = processedXml.replace(new RegExp(`&${entityName};`, 'g'), fileContent);
          } else {
            processedXml = processedXml.replace(new RegExp(`&${entityName};`, 'g'), `[File Content for ${sysPath}]`);
          }
        }
      } catch (fErr) {
        processedXml = processedXml.replace(new RegExp(`&${entityName};`, 'g'), `[Read Error: ${fErr.message}]`);
      }
    }

    parsedXmlStr = processedXml;

    // Parse XML structure using fast-xml-parser
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({
      ignoreAttributes: false,
      processEntities: true
    });

    const parsedObj = parser.parse(processedXml);
    const studentsArr = parsedObj.students ? (Array.isArray(parsedObj.students.student) ? parsedObj.students.student : [parsedObj.students.student]) : [];

    for (const s of studentsArr) {
      if (s) {
        importedStudents.push({
          name: typeof s.name === 'object' ? JSON.stringify(s.name) : (s.name || 'Unknown'),
          email: s.email || 'imported@lab',
          course: s.course || 'General',
          studentIdNum: s.student_id || `STU-XML-${Math.floor(Math.random() * 1000)}`
        });
      }
    }

    return res.render('import', {
      result: `Successfully processed XML document (${importedStudents.length} student records identified). Raw Parsed Output: ${parsedXmlStr}`,
      importedStudents,
      error: null
    });
  } catch (err) {
    return res.render('import', { 
      result: null, 
      importedStudents: [], 
      error: `XXE / XML Processing Error: ${err.message}` 
    });
  }
});

module.exports = router;
