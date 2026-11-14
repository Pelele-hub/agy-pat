' start_studio_api_silent.vbs - Invisibly launch Quran Studio API on Windows boot
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\majji\quran_video_studio"
WshShell.Run "cmd /c node scripts\server.mjs", 0, False
