import * as task from 'azure-pipelines-task-lib/task';
import { report } from 'process';
import { DetectADOConstants } from './lib/BlackDuckConstants';
import { IBlackDuckConfig } from './models/IBlackDuckConfig';
import { BlackDuckNotice } from './services/BlackDuckNotice'

async function run() {
    const bdService = task.getInput('blackduckconnection', false);
    const bdTkn = task.getInput('blackducktoken', false);
    const bdProjectName = task.getInput('projectName', true);
    const bdVersionName = task.getInput('versionName', true);
    const noticeFilePath = task.getInput('noticeFilePath', true);
    const baseUrl = "allegion.blackducksoftware.com";
    let blackduckNotice: BlackDuckNotice;

    if (bdService === undefined && bdTkn === undefined)
    {
        task.setResult(task.TaskResult.Failed, 'Need Black Duck connection string or token');
        return
    }

    /* Get Black Duck Token from Service Connection*/
    else if (bdTkn === undefined && typeof bdService !== undefined)
    {
        let bdCreds: IBlackDuckConfig = await getBlackDuckCredentials(bdService);
        task.setSecret(bdCreds.blackduckApiToken);
        blackduckNotice = new BlackDuckNotice(bdCreds.blackduckApiToken, bdProjectName, bdVersionName, baseUrl);
    }

    else if (bdService === undefined && typeof bdTkn !== undefined)
    {
        task.setSecret(bdTkn);
        blackduckNotice = new BlackDuckNotice(bdTkn, bdProjectName, bdVersionName, baseUrl);
    }
    /* Run BlackDuck API Calls */
    try {
        const reportUrl = await blackduckNotice.start(bdProjectName, bdVersionName, noticeFilePath);
        task.uploadArtifact('LICENSEFILE', noticeFilePath, 'License');
        task.setResult(task.TaskResult.Succeeded, `Successfully written file to ${noticeFilePath}`)
    } catch (error) {
        task.setResult(task.TaskResult.Failed, `Task failed: ${error}`);        
    }
}

run();

async function getBlackDuckCredentials(bdService): Promise<IBlackDuckConfig> {
    const bdUrl: string = task.getEndpointUrl(bdService, false);
    const bdToken: string = task.getEndpointAuthorizationParameter(bdService, DetectADOConstants.BLACKDUCK_API_TOKEN, false);

    return {
        blackduckUrl: bdUrl,
        blackduckApiToken: bdToken
    }
}