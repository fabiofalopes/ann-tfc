const fs = require('fs');
const path = require('path');

// Configuration
const SCREENSHOTS_DIR = './sitemap_screenshots';
const OUTPUT_FILE = './visual-sitemap.html';

// Page definitions with descriptions and route information
const pageDefinitions = [
  {
    filename: '01_LoginPage.png',
    title: 'Login Page',
    route: '/login',
    description: 'Entry point for user authentication. Users can log in as Admin or Annotator.',
    section: 'Authentication',
    userType: 'Public'
  },
  {
    filename: '02_AnnotatorDashboard.png',
    title: 'Annotator Dashboard',
    route: '/dashboard',
    description: 'Main dashboard for annotators showing available projects and navigation options.',
    section: 'Annotator Flow',
    userType: 'Annotator'
  },
  {
    filename: '03_AnnotatorProjectPage.png',
    title: 'Annotator Project Page',
    route: '/projects/{id}',
    description: 'Project overview for annotators showing chat rooms available for annotation.',
    section: 'Annotator Flow',
    userType: 'Annotator'
  },
  {
    filename: '04_AnnotatorChatRoomPage.png',
    title: 'Annotator Chat Room Page',
    route: '/projects/{id}/chat-rooms/{chatRoomId}',
    description: 'Main annotation interface where annotators perform chat thread untangling.',
    section: 'Annotator Flow',
    userType: 'Annotator'
  },
  {
    filename: '05_MyAnnotationsPage.png',
    title: 'My Annotations Page',
    route: '/projects/{id}/my-annotations',
    description: 'Personal annotation history and progress tracking for annotators.',
    section: 'Annotator Flow',
    userType: 'Annotator'
  },
  {
    filename: '06_AdminDashboard.png',
    title: 'Admin Dashboard',
    route: '/admin',
    description: 'Administrative overview with project management and system monitoring.',
    section: 'Administrator Flow',
    userType: 'Administrator'
  },
  {
    filename: '07_AdminProjectPage.png',
    title: 'Admin Project Page',
    route: '/admin/projects/{id}',
    description: 'Detailed project management interface for administrators.',
    section: 'Administrator Flow',
    userType: 'Administrator'
  },
  {
    filename: '08_AdminChatRoomView.png',
    title: 'Admin Chat Room View',
    route: '/admin/projects/{id}/chat-rooms/{chatRoomId}',
    description: 'Administrative view of chat room data and annotation progress.',
    section: 'Administrator Flow',
    userType: 'Administrator'
  },
  {
    filename: '09_AnnotationAnalysisPage.png',
    title: 'Annotation Analysis Page',
    route: '/admin/projects/{id}/analysis/{chatRoomId}',
    description: 'Advanced analytics and Inter-Annotator Agreement (IAA) analysis tools.',
    section: 'Administrator Flow',
    userType: 'Administrator'
  }
];

// Generate HTML content
const generateHTML = () => {
  const timestamp = new Date().toLocaleString();
  
  // Group pages by section
  const sections = {};
  pageDefinitions.forEach(page => {
    if (!sections[page.section]) {
      sections[page.section] = [];
    }
    sections[page.section].push(page);
  });

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Sitemap - Annotation Tool Frontend</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .timestamp {
            background: rgba(255,255,255,0.1);
            padding: 8px 16px;
            border-radius: 20px;
            margin-top: 15px;
            display: inline-block;
        }
        
        .section {
            margin-bottom: 50px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3498db;
        }
        
        .pages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
        }
        
        .page-card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .page-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }
        
        .page-image {
            width: 100%;
            height: 250px;
            object-fit: cover;
            border-bottom: 1px solid #eee;
        }
        
        .page-info {
            padding: 20px;
        }
        
        .page-title {
            font-size: 1.3em;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .page-route {
            font-family: 'Courier New', monospace;
            background: #f1f2f6;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
            color: #5f27cd;
            margin-bottom: 12px;
            display: inline-block;
        }
        
        .page-description {
            color: #666;
            line-height: 1.5;
            margin-bottom: 12px;
        }
        
        .user-type {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .user-type.public {
            background: #e8f5e8;
            color: #2d5a2d;
        }
        
        .user-type.annotator {
            background: #e3f2fd;
            color: #1565c0;
        }
        
        .user-type.administrator {
            background: #fff3e0;
            color: #ef6c00;
        }
        
        .navigation-flow {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .flow-title {
            font-size: 1.4em;
            color: #2c3e50;
            margin-bottom: 15px;
        }
        
        .flow-description {
            color: #666;
            line-height: 1.6;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .pages-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .container {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Visual Sitemap</h1>
            <p>Annotation Tool Frontend - Complete Application Flow</p>
            <div class="timestamp">Generated on ${timestamp}</div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${pageDefinitions.length}</div>
                <div class="stat-label">Total Pages</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(sections).length}</div>
                <div class="stat-label">User Flows</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pageDefinitions.filter(p => p.userType === 'Annotator').length}</div>
                <div class="stat-label">Annotator Pages</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pageDefinitions.filter(p => p.userType === 'Administrator').length}</div>
                <div class="stat-label">Admin Pages</div>
            </div>
        </div>
        
        <div class="navigation-flow">
            <div class="flow-title">Application Navigation Flow</div>
            <div class="flow-description">
                <strong>Authentication:</strong> Users start at the login page and are redirected based on their role.<br>
                <strong>Annotator Flow:</strong> Dashboard → Project Selection → Chat Room → Annotation Interface → My Annotations<br>
                <strong>Administrator Flow:</strong> Admin Dashboard → Project Management → Chat Room Monitoring → Analytics & IAA Analysis
            </div>
        </div>
`;

  // Generate sections
  Object.keys(sections).forEach(sectionName => {
    html += `
        <div class="section">
            <h2 class="section-title">${sectionName}</h2>
            <div class="pages-grid">`;
    
    sections[sectionName].forEach(page => {
      const userTypeClass = page.userType.toLowerCase();
      html += `
                <div class="page-card">
                    <img src="${SCREENSHOTS_DIR}/${page.filename}" alt="${page.title}" class="page-image">
                    <div class="page-info">
                        <h3 class="page-title">${page.title}</h3>
                        <div class="page-route">${page.route}</div>
                        <p class="page-description">${page.description}</p>
                        <span class="user-type ${userTypeClass}">${page.userType}</span>
                    </div>
                </div>`;
    });
    
    html += `
            </div>
        </div>`;
  });

  html += `
    </div>
</body>
</html>`;

  return html;
};

// Main execution
try {
  // Check if screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.error(`❌ Screenshots directory not found: ${SCREENSHOTS_DIR}`);
    process.exit(1);
  }

  // Check if all screenshot files exist
  const missingFiles = [];
  pageDefinitions.forEach(page => {
    const filePath = path.join(SCREENSHOTS_DIR, page.filename);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(page.filename);
    }
  });

  if (missingFiles.length > 0) {
    console.error(`❌ Missing screenshot files: ${missingFiles.join(', ')}`);
    console.error('Please run the sitemap generator first: npx playwright test playwright/sitemap-generator.spec.js');
    process.exit(1);
  }

  // Generate and save HTML
  const htmlContent = generateHTML();
  fs.writeFileSync(OUTPUT_FILE, htmlContent);
  
  console.log(`✅ Visual sitemap generated successfully: ${OUTPUT_FILE}`);
  console.log(`📊 Total pages: ${pageDefinitions.length}`);
  console.log(`🔗 Open in browser: file://${path.resolve(OUTPUT_FILE)}`);
  
} catch (error) {
  console.error('❌ Error generating sitemap:', error.message);
  process.exit(1);
} 