# Define project name
$projectName = "algorithm-generator"

# Create React app
Write-Host "Creating React App..."
npx create-react-app $projectName

# Navigate into the project
Set-Location -Path $projectName

# Install dependencies
Write-Host "Installing Dependencies..."
npm install mermaid react-markdown @monaco-editor/react

# Create project folders
Write-Host "Setting up folder structure..."
New-Item -ItemType Directory -Path "src\components"
New-Item -ItemType Directory -Path "src\pages"
New-Item -ItemType Directory -Path "src\styles"

# Create component files
New-Item -ItemType File -Path "src\components\Flowchart.js"
New-Item -ItemType File -Path "src\components\CodeEditor.js"
New-Item -ItemType File -Path "src\components\Pseudocode.js"

# Create page files
New-Item -ItemType File -Path "src\pages\Home.js"
New-Item -ItemType File -Path "src\pages\About.js"

# Create global styles
New-Item -ItemType File -Path "src\styles\index.css"

Write-Host "Project setup complete! ✅"
Write-Host "Run 'cd $projectName' and 'npm start' to launch the project."
