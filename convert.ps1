Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\ek13\.gemini\antigravity\brain\0fcbcc49-52d0-459a-a86b-f125402287ed\fonograficus_disco_vinyl_1791384880791.jpg')
$img.Save('E:\AI_BASE_DEPLOY\fonograficus-web\public\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Save('E:\AI_BASE_DEPLOY\fonograficus-web\public\apple-touch-icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Save('E:\AI_BASE_DEPLOY\FONOGRAFICUS\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)