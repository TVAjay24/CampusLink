import os

def bundle():
    # Get absolute paths of the files
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(workspace_dir, "index.html")
    css_path = os.path.join(workspace_dir, "styles.css")
    js_path = os.path.join(workspace_dir, "app.js")
    output_path = os.path.join(workspace_dir, "campuslink_standalone.html")

    print(f"Reading index.html from {index_path}...")
    with open(index_path, "r", encoding="utf-8") as f:
        index_content = f.read()

    print(f"Reading styles.css from {css_path}...")
    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()

    print(f"Reading app.js from {js_path}...")
    with open(js_path, "r", encoding="utf-8") as f:
        js_content = f.read()

    # Replace CSS reference
    css_tag = '<link rel="stylesheet" href="styles.css">'
    css_replacement = f"<style>\n{css_content}\n</style>"
    if css_tag in index_content:
        index_content = index_content.replace(css_tag, css_replacement)
        print("Successfully embedded styles.css")
    else:
        print("Warning: CSS tag not found in index.html")

    # Replace JS reference
    js_tag = '<script src="app.js"></script>'
    js_replacement = f"<script>\n{js_content}\n</script>"
    if js_tag in index_content:
        index_content = index_content.replace(js_tag, js_replacement)
        print("Successfully embedded app.js")
    else:
        print("Warning: JS tag not found in index.html")

    print(f"Writing standalone bundle to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    print("Bundling complete!")

if __name__ == "__main__":
    bundle()
