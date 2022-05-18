[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)][string]$VssExtensionJsonPath,
    [Parameter(Mandatory=$true)][string]$TaskJsonPath,
    [Parameter(Mandatory=$true)][Version]$MarketPlaceVersion
)

$TaskJson = Get-Content -Path $TaskJsonPath | ConvertFrom-Json -Depth 9
$ExtensionJson = Get-Content -Path $VssExtensionJsonPath | ConvertFrom-Json -Depth 9

$ExtensionVersion = [Version]::new($ExtensionJson.version)

$TaskVersion = [Version]::new($TaskJson.version.Major,$TaskJson.version.Minor,$TaskJson.version.Patch)

Write-Host "Feed version: $MarketPlaceVersion"
Write-Host "Task version: $TaskVersion"
Write-Host "Extension version: $ExtensionVersion"

function Update-JSONFiles () {
    $newVersion = [Version]::new($MarketPlaceVersion.Major,$MarketPlaceVersion.Minor,$MarketPlaceVersion.Build+1)
    $TaskJson.version.Major = $newVersion.Major;
    $TaskJson.version.Minor = $newVersion.Minor;
    $TaskJson.version.Patch = $newVersion.Build;
    $ExtensionJson.version = "$($newVersion.Major).$($newVersion.Minor).$($newVersion.Build)"
    $TaskJson | ConvertTo-Json -Depth 9 | Set-Content $TaskJsonPath 
    $ExtensionJson | ConvertTo-Json -Depth 9 | Set-Content $VssExtensionJsonPath
}

if ($ExtensionVersion -gt $MarketPlaceVersion) {
    Write-Host "Using version set in vss-extension.json and task.json"
} elseif (($ExtensionVersion -eq $MarketPlaceVersion) -or ($ExtensionVersion -lt $MarketPlaceVersion))  {
    Write-Host "Updating patch in vss-extension.json and task.json"
    Update-JSONFiles;
}else {
    Write-Host "Version left unchanged"
}

