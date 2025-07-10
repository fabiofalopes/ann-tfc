const fs = require('fs');
const path = require('path');

// Configuration
const SCREENSHOTS_DIR = './sitemap_screenshots';
const OUTPUT_FILE = './visual-sitemap.html';

// Define the sitemap structure with connections
const sitemapStructure = {
  title: "Annotation Tool - Visual Sitemap",
  subtitle: "Complete application map showing all user interfaces and navigation flows",
  sections: [
    {
      title: "Authentication",
      pages: [
        {
          filename: "01_LoginPage.png",
          title: "Login Page",
          route: "/login",
          description: "User authentication entry point",
          connections: ["dashboard", "admin"]
        }
      ]
    },
    {
      title: "Annotator Flow",
      pages: [
        {
          filename: "02_AnnotatorDashboard.png",
          title: "Annotator Dashboard",
          route: "/dashboard",
          description: "Main dashboard for annotators showing assigned projects",
          connections: ["project-page"]
        },
        {
          filename: "03_AnnotatorProjectPage.png",
          title: "Project Overview",
          route: "/projects/:id",
          description: "Project details and available chat rooms for annotation",
          connections: ["chat-room", "my-annotations"]
        },
        {
          filename: "04_AnnotatorChatRoomPage.png",
          title: "Chat Room Annotation",
          route: "/projects/:id/chat-rooms/:id",
          description: "Main annotation interface for chat conversations",
          connections: []
        },
        {
          filename: "05_MyAnnotationsPage.png",
          title: "My Annotations",
          route: "/projects/:id/my-annotations",
          description: "Personal annotation history and progress tracking",
          connections: []
        }
      ]
    },
    {
      title: "Administrator Flow",
      pages: [
        {
          filename: "06_AdminDashboard.png",
          title: "Admin Dashboard",
          route: "/admin",
          description: "Administrative overview of projects and users",
          connections: ["admin-project"]
        },
        {
          filename: "07_AdminProjectPage.png",
          title: "Project Management",
          route: "/admin/projects/:id",
          description: "Project administration, user assignment, and data management",
          connections: ["admin-chat-room", "analysis"]
        },
        {
          filename: "08_AdminChatRoomView.png",
          title: "Chat Room Monitoring",
          route: "/admin/projects/:id/chat-rooms/:id",
          description: "Monitor annotation progress and view user contributions",
          connections: []
        },
        {
          filename: "09_AnnotationAnalysisPage.png",
          title: "Inter-Annotator Agreement",
          route: "/admin/projects/:id/analysis/:id",
          description: "Statistical analysis of annotation quality and agreement",
          connections: []
        }
      ]
    }
  ]
};

// Generate HTML content
const generateHTML = () => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sitemapStructure.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 60px;
            padding: 40px 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            color: #1e293b;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            color: #64748b;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .section {
            margin-bottom: 80px;
        }
        
        .section-title {
            font-size: 1.8rem;
            color: #1e293b;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3b82f6;
            display: inline-block;
        }
        
        .pages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }
        
        .page-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .page-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        }
        
        .page-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .page-info {
            padding: 20px;
        }
        
        .page-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
        }
        
        .page-route {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            color: #3b82f6;
            background: #eff6ff;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 12px;
        }
        
        .page-description {
            color: #64748b;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        
        .flow-indicators {
            margin-top: 40px;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .flow-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 15px;
        }
        
        .flow-description {
            color: #64748b;
            margin-bottom: 20px;
        }
        
        .flow-paths {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .flow-path {
            background: #f1f5f9;
            padding: 10px 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            font-size: 0.9rem;
        }
        
        .timestamp {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: white;
            border-radius: 12px;
            color: #64748b;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .pages-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .container {
                padding: 20px 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${sitemapStructure.title}</h1>
            <p>${sitemapStructure.subtitle}</p>
        </div>
        
        ${sitemapStructure.sections.map(section => `
            <div class="section">
                <h2 class="section-title">${section.title}</h2>
                <div class="pages-grid">
                    ${section.pages.map(page => `
                        <div class="page-card">
                            <img src="${SCREENSHOTS_DIR}/${page.filename}" alt="${page.title}" class="page-image">
                            <div class="page-info">
                                <h3 class="page-title">${page.title}</h3>
                                <div class="page-route">${page.route}</div>
                                <p class="page-description">${page.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
        
        <div class="flow-indicators">
            <h3 class="flow-title">Navigation Flow</h3>
            <p class="flow-description">
                This application follows a role-based navigation structure with distinct paths for annotators and administrators.
            </p>
            <div class="flow-paths">
                <div class="flow-path">
                    <strong>Annotator Path:</strong> Login → Dashboard → Project → Chat Room / My Annotations
                </div>
                <div class="flow-path">
                    <strong>Admin Path:</strong> Login → Admin Dashboard → Project Management → Chat Room Monitoring / Analysis
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
    </div>
</body>
</html>
`;
  
  return html;
};

// Create the sitemap document
const createSitemapDocument = () => {
  console.log('🎨 Creating visual sitemap document...');
  
  // Check if screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.error('❌ Screenshots directory not found. Please run the sitemap generator first.');
    return;
  }
  
  // Generate HTML
  const html = generateHTML();
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, html);
  
  console.log(`✅ Visual sitemap created: ${OUTPUT_FILE}`);
  console.log('📖 Open this file in your browser to view the complete sitemap');
};

// Run the script
createSitemapDocument(); 