import { IBlackDuckToken } from '../models/IBlackDuckToken';
import { IBlackDuckProject } from '../models/IBlackDuckProject';
import { IBlackDuckReportList, IBlackDuckReport } from '../models/IBlackDuckReport';
import { IBlackDuckVersion } from '../models/IBlackDuckVersion';
import { BlackDuckAPICalls } from './BlackDuckApiCalls';
import * as fs from 'fs';
import * as util from 'util';
import * as jszip from 'jszip';
const delay = util.promisify(setTimeout);

export class BlackDuckNotice extends BlackDuckAPICalls {

    constructor(_bdToken: string, _bdProjectName: string, _bdVersionName: string, _baseUrl: string) {
        super(_bdToken, _bdProjectName, _bdVersionName, _baseUrl);
    }

    async getBlackDuckVersionDetails(): Promise<IBlackDuckVersion> {
        this.bearerToken = await this.authenticate(this.baseUrl, this.bdToken);
        let projectUrl = `https://${this.baseUrl}/api/projects?q=name:${this.bdProjectName}`;
        const projectDetails = await this.getProjects(projectUrl, this.bearerToken);
        const versionUrl = `${projectDetails.items[0]._meta.href}/versions?q=versionName:${this.bdVersionName}&limit=1`;
        let versionDetails: IBlackDuckVersion = await this.getVersions(versionUrl, this.bearerToken);
        return versionDetails
    }

    async getLicenseReportUrl(version: IBlackDuckVersion): Promise<string> {
        const versionLinks = version.items[0]._meta.links;
        const reportRef = versionLinks.find( ({ rel }) => rel === "licenseReports");
        const latestReportUrl = `${reportRef.href}?sort=createdat:desc&limit=1`;
        return latestReportUrl;
    }

    async getMostRecentReportUrl(reportUrl: string): Promise<string>{
        let recentReportDetails = await this.getReportDetails(reportUrl, this.bearerToken);
        if (recentReportDetails.totalCount <= 0){
            try {
                await this.postNotice(reportUrl, this.bearerToken)
                recentReportDetails = await this.getReportDetails(reportUrl, this.bearerToken);
                let numberOfchecks: number = 0;
                while (recentReportDetails.items[0].status !== "COMPLETED" || numberOfchecks > 24)
                {
                    recentReportDetails = await this.checkNoticeState(reportUrl, 5000);
                    numberOfchecks++;
                }     
            } catch (error) {
                console.log(error)
            }
        }
        const reportContentLinks = recentReportDetails.items[0]._meta.links;
        const reportContentUrl = reportContentLinks.find( ({ rel }) => rel === "download");
        return reportContentUrl.href;
    }

    async checkNoticeState(reportUrl: string, timer: number): Promise<IBlackDuckReportList> {
        const reportDetails: IBlackDuckReportList = await delay(timer, await this.getReportDetails(reportUrl, this.bearerToken));
        return reportDetails;
    }

    async modTextContent(txt:string, bdPrjName:string, bdVerName:string): Promise<string>{
        txt = txt.replace('Copyright 2022', '');
        txt = txt.replace(`[${bdPrjName} : ${bdVerName}]`, '');
        txt = txt.replace('Phase: DEVELOPMENT', '');
        txt = txt.replace('Distribution: EXTERNAL', '');
        txt = txt.trimStart();
        return txt;
    }

    async getContent(contentUrl: string, bdPrjName: string, bdVerName: string, noticeFilePath): Promise<void>{
        console.log(contentUrl);
        const zipLicenseFilePath = await this.getReportContent(contentUrl, this.bearerToken, noticeFilePath);
        const zipFileData = fs.promises.readFile(zipLicenseFilePath);
        const fileData = await jszip.loadAsync(zipFileData);
        const fileKeys = Object.keys(fileData.files);
        for (const key of fileKeys ){
            const data = fileData.files[key];
            if(!data.dir){
                const content = Buffer.from(await data.async('arraybuffer')).toString();
                const modContent = await this.modTextContent(content, this.bdProjectName, this.bdVersionName);
                await fs.promises.writeFile(noticeFilePath, modContent);
                console.log(`License file written to ${noticeFilePath}`);
                await fs.promises.unlink(zipLicenseFilePath);
            }
        }
    }

    async modifyNoticeFile(modifyNoticeDirectory: string, noticeFilePath: string): Promise<void> {
        const regex = /-|\s/g;
        const fileName = `${this.bdProjectName}_${this.bdVersionName}_Black_Duck_Notices_Report.txt`
        const convertedFileName = fileName.replace(regex, '_');
        const modifyFilePath = `${modifyNoticeDirectory}/${convertedFileName}`
        const bufferText = fs.promises.readFile(modifyFilePath);
        const txt = await bufferText.toString()
        const modText = await this.modTextContent(txt, this.bdProjectName, this.bdVersionName);
        await fs.promises.writeFile(noticeFilePath, modText, );
    }

    async getLatestNoticeFile(noticeFilePath: string): Promise<void> {
        const versionDetails = await this.getBlackDuckVersionDetails();
        const latestReportUrl = await this.getLicenseReportUrl(versionDetails);
        const contentUrl = await this.getMostRecentReportUrl(latestReportUrl);
        const content = await this.getContent(contentUrl, this.bdProjectName, this.bdVersionName, noticeFilePath);
    }

    async createNoticeFile(): Promise<void>{
        const versionDetails = await this.getBlackDuckVersionDetails();
        const reportUrl = versionDetails.items[0]._meta.links.find(({ rel }) => rel === "licenseReports");
        const reportPath = reportUrl.href.split(this.baseUrl)[1];
        await this.postNotice(reportPath, this.bearerToken)
    }
}