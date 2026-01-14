"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlackDuckNotice = void 0;
const BlackDuckApiCalls_1 = require("./BlackDuckApiCalls");
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const jszip = __importStar(require("jszip"));
const delay = util.promisify(setTimeout);
class BlackDuckNotice extends BlackDuckApiCalls_1.BlackDuckAPICalls {
    constructor(_bdToken, _bdProjectName, _bdVersionName, _baseUrl) {
        super(_bdToken, _bdProjectName, _bdVersionName, _baseUrl);
    }
    async getBlackDuckVersionDetails() {
        this.bearerToken = await this.authenticate(this.baseUrl, this.bdToken);
        let projectUrl = `https://${this.baseUrl}/api/projects?q=name:${this.bdProjectName}`;
        const projectDetails = await this.getProjects(projectUrl, this.bearerToken);
        if (!projectDetails || !projectDetails.items || projectDetails.items.length === 0) {
            throw new Error(`Project "${this.bdProjectName}" not found in Black Duck. Please verify the project name.`);
        }
        const versionUrl = `${projectDetails.items[0]._meta.href}/versions?q=versionName:${this.bdVersionName}&limit=1`;
        let versionDetails = await this.getVersions(versionUrl, this.bearerToken);
        if (!versionDetails || !versionDetails.items || versionDetails.items.length === 0) {
            throw new Error(`Version "${this.bdVersionName}" not found for project "${this.bdProjectName}". Please verify the version name.`);
        }
        return versionDetails;
    }
    async getLicenseReportUrl(version) {
        const versionLinks = version.items[0]._meta.links;
        const reportRef = versionLinks.find(({ rel }) => rel === "licenseReports");
        const latestReportUrl = `${reportRef.href}?sort=createdat:desc&limit=1`;
        return latestReportUrl;
    }
    async getMostRecentReportUrl(reportUrl) {
        let recentReportDetails = await this.getReportDetails(reportUrl, this.bearerToken);
        if (recentReportDetails.totalCount <= 0) {
            try {
                await this.postNotice(reportUrl, this.bearerToken);
                recentReportDetails = await this.getReportDetails(reportUrl, this.bearerToken);
                let numberOfchecks = 0;
                while (recentReportDetails.items[0].status !== "COMPLETED" || numberOfchecks > 24) {
                    recentReportDetails = await this.checkNoticeState(reportUrl, 5000);
                    numberOfchecks++;
                }
            }
            catch (error) {
                console.log(error);
            }
        }
        if (!recentReportDetails || !recentReportDetails.items || recentReportDetails.items.length === 0) {
            throw new Error(`No license reports found. Please ensure a report has been generated for this version.`);
        }
        const reportContentLinks = recentReportDetails.items[0]._meta.links;
        const reportContentUrl = reportContentLinks.find(({ rel }) => rel === "download");
        return reportContentUrl.href;
    }
    async checkNoticeState(reportUrl, timer) {
        const reportDetails = await delay(timer, await this.getReportDetails(reportUrl, this.bearerToken));
        return reportDetails;
    }
    async modTextContent(txt, bdPrjName, bdVerName) {
        txt = txt.replace('Copyright 2022', '');
        txt = txt.replace(`[${bdPrjName} : ${bdVerName}]`, '');
        txt = txt.replace('Phase: DEVELOPMENT', '');
        txt = txt.replace('Distribution: EXTERNAL', '');
        txt = txt.trimStart();
        return txt;
    }
    async getContent(contentUrl, bdPrjName, bdVerName, noticeFilePath) {
        console.log(contentUrl);
        const zipLicenseFilePath = await this.getReportContent(contentUrl, this.bearerToken, noticeFilePath);
        const zipFileData = fs.promises.readFile(zipLicenseFilePath);
        const fileData = await jszip.loadAsync(zipFileData);
        const fileKeys = Object.keys(fileData.files);
        for (const key of fileKeys) {
            const data = fileData.files[key];
            if (!data.dir) {
                const content = Buffer.from(await data.async('arraybuffer')).toString();
                const modContent = await this.modTextContent(content, this.bdProjectName, this.bdVersionName);
                await fs.promises.writeFile(noticeFilePath, modContent);
                console.log(`License file written to ${noticeFilePath}`);
                await fs.promises.unlink(zipLicenseFilePath);
            }
        }
    }
    async modifyNoticeFile(modifyNoticeDirectory, noticeFilePath) {
        const regex = /-|\s/g;
        const fileName = `${this.bdProjectName}_${this.bdVersionName}_Black_Duck_Notices_Report.txt`;
        const convertedFileName = fileName.replace(regex, '_');
        const modifyFilePath = `${modifyNoticeDirectory}/${convertedFileName}`;
        const bufferText = fs.promises.readFile(modifyFilePath);
        const txt = await bufferText.toString();
        const modText = await this.modTextContent(txt, this.bdProjectName, this.bdVersionName);
        await fs.promises.writeFile(noticeFilePath, modText);
    }
    async getLatestNoticeFile(noticeFilePath) {
        const versionDetails = await this.getBlackDuckVersionDetails();
        const latestReportUrl = await this.getLicenseReportUrl(versionDetails);
        const contentUrl = await this.getMostRecentReportUrl(latestReportUrl);
        const content = await this.getContent(contentUrl, this.bdProjectName, this.bdVersionName, noticeFilePath);
    }
    async createNoticeFile() {
        const versionDetails = await this.getBlackDuckVersionDetails();
        const reportUrl = versionDetails.items[0]._meta.links.find(({ rel }) => rel === "licenseReports");
        const reportPath = reportUrl.href.split(this.baseUrl)[1];
        await this.postNotice(reportPath, this.bearerToken);
    }
}
exports.BlackDuckNotice = BlackDuckNotice;
