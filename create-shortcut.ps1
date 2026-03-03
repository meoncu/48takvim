$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = "$env:USERPROFILE\Desktop\48takvim.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Windows\System32\cmd.exe"
# Run the batch file and keep the console open after execution
$Shortcut.Arguments = '/c "C:\Cursor\48takvim\run-dev.bat"'
$Shortcut.WorkingDirectory = "C:\Cursor\48takvim"
# Optional icon – use a placeholder if you have one
$Shortcut.IconLocation = "C:\Cursor\48takvim\public\icons\icon-512.png"
$Shortcut.Save()
Write-Host "Shortcut created at $ShortcutPath"
