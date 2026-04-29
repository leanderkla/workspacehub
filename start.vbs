Option Explicit

' Silent launcher for WorkspaceHub.
' Spawns electron.exe directly so there is no cmd/console window in the taskbar.

Dim WshShell, fso, scriptDir, electronExe, cmdLine
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
electronExe = scriptDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(electronExe) Then
    MsgBox "Electron is not installed yet." & vbCrLf & _
           "Run start.bat once to install dependencies, then use this launcher.", _
           vbExclamation, "WorkspaceHub"
    WScript.Quit 1
End If

cmdLine = """" & electronExe & """ """ & scriptDir & """"
' 0 = hidden window, False = don't wait for it to exit
WshShell.Run cmdLine, 0, False
