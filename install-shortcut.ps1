# Creates a Desktop shortcut that launches WorkspaceHub via Electron
# with a matching AppUserModelID so Windows can pin it to the taskbar.

$ErrorActionPreference = 'Stop'

$scriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$electronExe  = Join-Path $scriptDir 'node_modules\electron\dist\electron.exe'
$shortcutName = 'WorkspaceHub.lnk'
$desktop      = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop $shortcutName

if (-not (Test-Path $electronExe)) {
    Write-Host 'Electron not found. Run start.bat once to install dependencies, then rerun this script.' -ForegroundColor Yellow
    exit 1
}

$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($shortcutPath)
$lnk.TargetPath       = $electronExe
$lnk.Arguments        = '"' + $scriptDir + '"'
$lnk.WorkingDirectory = $scriptDir
$appIcon              = Join-Path $scriptDir 'icons\workspacehub.ico'
if (Test-Path $appIcon) {
    $lnk.IconLocation = $appIcon + ',0'
} else {
    $lnk.IconLocation = $electronExe + ',0'
}
$lnk.Description      = 'WorkspaceHub'
$lnk.Save()

# Set AppUserModelID on the shortcut so Windows treats pins as one distinct app.
try {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class PropertyStoreHelper {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    public static extern void SHGetPropertyStoreFromParsingName(
        [MarshalAs(UnmanagedType.LPWStr)] string pszPath,
        IntPtr pbc,
        int flags,
        ref Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out IPropertyStore propertyStore);

    [ComImport]
    [Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IPropertyStore {
        int GetCount([Out] out uint count);
        int GetAt([In] uint iProp, out PropertyKey pkey);
        int GetValue([In] ref PropertyKey key, [Out] out PropVariant pv);
        int SetValue([In] ref PropertyKey key, [In] ref PropVariant pv);
        int Commit();
    }

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    public struct PropertyKey {
        public Guid fmtid;
        public uint pid;
        public PropertyKey(Guid g, uint p) { fmtid = g; pid = p; }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PropVariant {
        public ushort vt;
        public ushort wReserved1;
        public ushort wReserved2;
        public ushort wReserved3;
        public IntPtr p;
        public int p2;
    }

    [DllImport("ole32.dll", PreserveSig = false)]
    public static extern void PropVariantClear([In, Out] ref PropVariant pvar);

    [DllImport("ole32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    public static extern int InitPropVariantFromString(
        [MarshalAs(UnmanagedType.LPWStr)] string psz,
        out PropVariant ppropvar);
}
'@

    $pkAppID = New-Object PropertyStoreHelper+PropertyKey ([Guid]'9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3'), 5
    $store = $null
    $iid = [Guid]'886d8eeb-8cf2-4446-8d02-cdba1dbdcf99'
    [PropertyStoreHelper]::SHGetPropertyStoreFromParsingName($shortcutPath, [IntPtr]::Zero, 2, [ref]$iid, [ref]$store)

    $propVar = New-Object PropertyStoreHelper+PropVariant
    [PropertyStoreHelper]::InitPropVariantFromString('com.workspacehub.app', [ref]$propVar)
    [void]$store.SetValue([ref]$pkAppID, [ref]$propVar)
    [void]$store.Commit()
    [PropertyStoreHelper]::PropVariantClear([ref]$propVar)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($store) | Out-Null
    Write-Host 'AppUserModelID set on shortcut.' -ForegroundColor Green
} catch {
    Write-Host 'Warning: could not set AppUserModelID on the shortcut (pinning may still work).' -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor DarkYellow
}

Write-Host ''
Write-Host ('Created: ' + $shortcutPath) -ForegroundColor Green
Write-Host ''
Write-Host 'Next: double-click the desktop shortcut to launch, then right-click the taskbar icon -> Pin to taskbar.' -ForegroundColor Cyan
