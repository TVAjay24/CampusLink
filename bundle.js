const fs = require('fs');
const path = require('path');

function bundle() {
    const workspaceDir = __dirname;
    const indexPath = path.join(workspaceDir, "index.html");
    const cssPath = path.join(workspaceDir, "styles.css");
    const jsPath = path.join(workspaceDir, "app.js");
    const outputPath = path.join(workspaceDir, "campuslink_standalone.html");

    console.log(`Reading index.html from ${indexPath}...`);
    const indexContent = fs.readFileSync(indexPath, "utf8");

    console.log(`Reading styles.css from ${cssPath}...`);
    const cssContent = fs.readFileSync(cssPath, "utf8");

    console.log(`Reading app.js from ${jsPath}...`);
    const jsContent = fs.readFileSync(jsPath, "utf8");

    // Replace CSS reference
    const cssTag = '<link rel="stylesheet" href="styles.css">';
    const cssReplacement = `<style>\n${cssContent}\n</style>`;
    let outputContent = indexContent;
    if (outputContent.includes(cssTag)) {
        outputContent = outputContent.replace(cssTag, cssReplacement);
        console.log("Successfully embedded styles.css");
    } else {
        console.log("Warning: CSS tag not found in index.html");
    }

    // Replace JS reference
    const jsTag = '<script src="app.js"></script>';
    const jsReplacement = `<script>\n${jsContent}\n</script>`;
    if (outputContent.includes(jsTag)) {
        outputContent = outputContent.replace(jsTag, jsReplacement);
        console.log("Successfully embedded app.js");
    } else {
        console.log("Warning: JS tag not found in index.html");
    }

    console.log(`Writing standalone bundle to ${outputPath}...`);
    fs.writeFileSync(outputPath, outputContent, "utf8");
    console.log("Bundling complete!");
}

bundle();
