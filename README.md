# Black Duck License Generator
The task performs actions regarding the notice file required to be in compliance with the distribution of open source licenses.

alle-bd-license-generator can modify the license file generated locally within the Black Duck DevOps task and output it to a specified directory (see below for examples). The modification strips some of the Black Duck information (Black Duck project name and version number) from the notice file. 

The task can also be configured to pull the latest notice file from Black Duck and generate a file as part of the build process -- for times when the Black Duck task might run.

The task can also trigger the new generation of the notice file within Black Duck.

```
- task: alle-bd-notices-extension@0
  inputs:
    blackduckconnection: <<' BLACK DUCK SERVICE CONNECTION NAME -- OPTIONAL'>>
    blackducktoken: <<' BLACK DUCK TOKEN -- OPTIONAL '>>
    projectName: <<' BLACK DUCK PROJECT NAME '>>
    versionName: <<' BLACK DUCK VERSION NAME '>>
    noticeFilePath: <<' PATH TO GENERATE THE NOTICE FILE WITH FILE NAME '>>
    localNoticeFileDirectory: <<' DIRECTORY WHERE BLACK DUCK TASK DOWNLOADS NOTICE FILE '>>
    generateNoticeFile: <<' BOOLEAN -- WHETHER TO TRIGGER NOTICE FILE GENERATION IN BLACK DUCK '>>
    getLatestNoticeFile: <<' BOOLEAN -- WHETHER TO TRIGGER LATEST PULL OF CONTENT FROM BLACK DUCK '>>
    modifyNoticeFile: <<' BOOLEAN -- WHETHER TO TRIGGER MODIFICATION OF NOTICE FILE '>>
```

## EXAMPLE USE CASE
Below provides a possible utilization of this task with Black Duck.

```
parameters:
- name: lock_file_name
  type: string
  default: 'package-lock.json' #packages.lock.json for .Net
- name: blackduck_service_connection
  type: string
- name: blackduck_project
  type: string
- name: blackduck_version
  type: string
- name: notice_file
  type: string

- task: ProductTech.alle-package-diff.alle-package-diff.alle-package-diff@0
  displayName: 'Check Package Changes'
  name: CheckPackageResult
  inputs:
    packagesFileName: ${{parameters.lock_file_name}}
    projectRootDirectory: $(System.DefaultWorkingDirectory)
    checkGit: true
  continueOnError: true
  condition: in(variables['Build.Reason'], 'PullRequest', 'Manual')

- task: synopsys-detect.synopsys-detect.synopsys-detect-task.SynopsysDetectTask@7
    displayName: 'BlackDuck Scan'
    inputs:
    BlackDuckService: ${{parameters.blackduck_service_connection}}
    DetectArguments: |
        --detect.project.name=${{parameters.blackduck_project}}
        --detect.project.version.name="${{parameters.blackduck_version}}"
        --detect.parallel.processors=-1
        --logging.level.com.synopsys.integration=INFO
        --detect.bom.aggregate.name=${{parameters.blackduck_project}}-BOM"
        --detect.code.location.name="${{parameters.blackduck_project}}-${{parameters.blackduck_version}}-Scan"
        --detect.blackduck.signature.scanner.snippet.matching=SNIPPET_MATCHING
        --detect.wait.for.results
        --detect.scan.output.path=$(Agent.TempDirectory)\bdscan-$(Build.SourceVersion)
        --detect.bdio.output.path=$(Agent.TempDirectory)\bdbdio-$(Build.SourceVersion)
        --detect.npm.include.dev.dependencies=true
        --detect.source.path="$(System.DefaultWorkingDirectory)/licensegenerator"
        --detect.notices.report=true
        --detect.notices.report.path="$(System.DefaultWorkingDirectory)"
    condition: and(in(variables['Build.Reason'], 'PullRequest', 'Manual'), eq(variables['CheckPackageResult.DEPENDENCY_CHANGED'], 'true'))

- task: alle-bd-notices-extension@0
  inputs:
    blackduckconnection: ${{parameters.blackduck_service_connection}}
    projectName: ${{parameters.blackduck_project}}
    versionName: ${{parameters.blackduck_version}}
    noticeFilePath: "$(Build.SourcesDirectory)/dist/assets/${{parameters.notice_file}}"
    localNoticeFileDirectory: $(System.DefaultWorkingDirectory)
    generateNoticeFile: and(in(variables['Build.Reason'], 'PullRequest', 'Manual'), eq(variables['CheckPackageResult.DEPENDENCY_CHANGED'], 'true'))
    modifyNoticeFile: and(in(variables['Build.Reason'], 'PullRequest', 'Manual'), eq(variables['CheckPackageResult.DEPENDENCY_CHANGED'], 'true'))
    getLatestNoticeFile: in(variables['Build.Reason'], 'IndividualCI', 'BatchedCI', 'Manual')
    
```