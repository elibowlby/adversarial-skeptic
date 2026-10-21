# Charmbracelet VHS tape for adversarial-skeptic workplace session
# Run: /opt/homebrew/bin/vhs assets/workplace-session.tape

Output assets/workplace-session.gif

Set Shell "bash"
Set FontSize 13
Set Width 1100
Set Height 740
Set LineHeight 1.25
Set Padding 20
Set Theme "Catppuccin Mocha"
Set PlaybackSpeed 1.0

Type "node scripts/record-workplace-session.mjs"
Sleep 500ms
Enter

Sleep 9s
