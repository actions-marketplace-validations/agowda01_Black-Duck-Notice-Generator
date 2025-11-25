import * as task from 'azure-pipelines-task-lib/task';
import { DetectADOConstants } from './lib/BlackDuckConstants';
import { IBlackDuckConfig } from './models/IBlackDuckConfig';
import { BlackDuckNotice } from './services/BlackDuckNotice'

async function run() {
    const bdService = task.getInput('blackduckconnection', false);
    const bdTkn = task.getInput('blackducktoken', false);
    const bdProjectName = task.getInput('projectName', true);
    const bdVersionName = task.getInput('versionName', true);
    const noticeFilePath = task.getInput('noticeFilePath', false);
    const localNoticeFileDirectory = task.getInput('localNoticeFileDirectory', false);
    const generateNoticeFile = task.getBoolInput('generateNoticeFile', false);
    const getLatestNoticeFile = task.getBoolInput('getLatestNoticeFile', false);
    const modifyNoticeFile = task.getBoolInput('modifyNoticeFile', false)
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
        blackduckNotice = new BlackDuckNotice(bdCreds.blackduckApiToken, bdProjectName, bdVersionName, bdCreds.blackduckUrl);
    }

    else if (bdService === undefined && typeof bdTkn !== undefined)
    {
        task.setSecret(bdTkn);
        blackduckNotice = new BlackDuckNotice(bdTkn, bdProjectName, bdVersionName, baseUrl);
    }
    /* Run BlackDuck API Calls */
    try {
        if (modifyNoticeFile)
        {
            const modifyReport = await blackduckNotice.modifyNoticeFile(localNoticeFileDirectory, noticeFilePath);
            task.setResult(task.TaskResult.Succeeded, `Successfully modified notice file to Black Duck`)
        }
        if(generateNoticeFile){
            const createReport = await blackduckNotice.createNoticeFile();
            task.setResult(task.TaskResult.Succeeded, `Successfully posted notice file to Black Duck`);
        }
        if (getLatestNoticeFile)
        {
            const latestReport = await blackduckNotice.getLatestNoticeFile(noticeFilePath);
            task.setResult(task.TaskResult.Succeeded, `Successfully written file to ${noticeFilePath}`);
        }

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