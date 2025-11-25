import { IRequestOptions } from "../models/IRequestOptions";
import { IBlackDuckProject } from "../models/IBlackDuckProject";
import { IBlackDuckToken } from "../models/IBlackDuckToken";
import { IBlackDuckVersion } from "../models/IBlackDuckVersion";
import { IBlackDuckReportList, IBlackDuckReport, IBlackDuckReportRequestBody } from '../models/IBlackDuckReport';
import * as https from 'https';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export class BlackDuckAPICalls {
    public bdToken: string;
    public bearerToken: string;
    public bdProjectName: string;
    public bdVersionName: string;
    public baseUrl: string;

    constructor(_bdToken: string, _bdProjectName: string, _bdVersionName: string, _baseUrl: string) {
        this.bdToken = _bdToken;
        this.bdProjectName = _bdProjectName;
        this.bdVersionName = _bdVersionName;
        this.baseUrl = _baseUrl.replace(/^https:\/\//, "").replace(/\/$/, '');
    }

    async authenticate(_baseUrl, _bdToken: string): Promise<string> {
        console.log("Authenticating...");
        let options: IRequestOptions = {
            hostname: _baseUrl,
            port: 443,
            path: '/api/tokens/authenticate',
            method: 'POST',
            headers: {
                'Authorization': `token ${this.bdToken}`,
                'Accept': 'application/vnd.blackducksoftware.user-4+json'
            }
        }
        let bearerResponse: IBlackDuckToken = await this.request(options);
        return bearerResponse.bearerToken;
    }

    async getProjects(_url: string, _bearerToken: string): Promise<IBlackDuckProject> {
        console.log("Get Projects...");
        let options: IRequestOptions = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.project-detail-4+json'
            }
        }
        return await this.getRequest(_url, options);
    }

    async getVersions(_url: string, _bearerToken: string): Promise<IBlackDuckVersion> {
        console.log("Get Versions...");
        let options: IRequestOptions = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.project-detail-5+json'
            }
        }
        return await this.getRequest(_url, options);
    }

    async postNotice(_path: string, _bearerToken:string): Promise<any> {
        console.log("Create Notice File...")
        let options: IRequestOptions = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Content-Type': 'application/vnd.blackducksoftware.report-5+json',
                'Accept': 'application/vnd.blackducksoftware.report-5+json'
            },
            method: 'POST',
            hostname: this.baseUrl,
            path: _path
        }

        const versionId = [8, 4, 4, 4, 12].map(n => crypto.randomBytes(n / 2).toString("hex")).join("-");

        let requestBody: IBlackDuckReportRequestBody = {
            reportFormat: 'TEXT',
            locale: 'en_US',
            versionId: versionId,
            categories: ['LICENSE_DATA', 'LICENSE_TEXT'],
            reportType: 'VERSION_LICENSE',
            includeSubprojects: true
        }
        return await this.request(options, JSON.stringify(requestBody));
    }

    async getReportContent(_url: string, _bearerToken: string, noticeFilePath): Promise<string> {
        console.log("Get Report Content...")
        let options: IRequestOptions = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.report-4+json'
            }
        }
        return await this.downloadFile(_url, options, noticeFilePath);
    }

    async getAltReportContent(malformedBody: string): Promise<IBlackDuckReport>{
        const regex = /\"fileContent\":\"(.*)\",\"fileNamePrefix\"/;
        const getContent = malformedBody.match(regex);
        const resp:IBlackDuckReport = {
            reportContent: [{
                fileName: "malformedlicense.txt",
                fileContent: getContent[1],
                fileNamePrefix: "malformedlicense"
            }]
        }
        return resp
    }

    async getReportDetails(_url: string, _bearerToken: string): Promise<IBlackDuckReportList> {
        console.log("Get Report Details...");
        let options: IRequestOptions = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.report-4+json'
            }
        }
        return await this.getRequest(_url, options);
    }   

    async request(options: IRequestOptions, data?:any): Promise<any> {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode > 400 && res.statusCode <= 500)
                {
                    return reject(new Error(`status code ${res.statusCode}`));
                }
                let body = [];
                let response;
                res.on('data', (data) => {
                    body.push(data);
                });
                res.on('end', () => {
                    try
                    {
                        if(body.length > 0){
                            response = JSON.parse(Buffer.concat(body).toString());
                        }
                    }
                    catch(error)
                    {
                        reject(error)
                    }
                    resolve(response);
                })
            });

            req.on('error', (error) => {
                reject(error);
            });
            if(data != null){
                try {
                    req.write(data);
                }
                catch(error){
                    resolve(error);
                }
            } 
            req.end();
        });
    }

    async getRequest(url: string, options: IRequestOptions, errorProcess?: Function): Promise<any> {
        return new Promise((resolve, reject) => {
            const req = https.get(url, options, (res) => {
                if (res.statusCode > 400 && res.statusCode <= 500)
                {
                    return reject(new Error(`status code ${res.statusCode}`));
                }
                let body = [];
                let response;
                res.on('data', (data) => {
                    body.push(data);
                });
                res.on('end', () => {
                    try
                    {   
                        response = JSON.parse(Buffer.concat(body).toString());
                    }
                    catch (error)
                    {
                        if (errorProcess != null)
                        {

                            response = errorProcess(Buffer.concat(body).toString());
                        }
                        else
                        {
                            reject(error)
                        }
                    }
                    resolve(response);
                })
            });

            req.on('error', (error) => {
                reject(error);
            });
            req.end();
        });
    }

    async downloadFile(url: string, options: IRequestOptions, noticeFilePath): Promise<any> {
        return new Promise((resolve, reject) => {
            const zipPath = `${path.dirname(noticeFilePath)}/bdlicense.zip`;
            const file = fs.createWriteStream(zipPath)
            const req = https.get(url, options, (res) => {
                if (res.statusCode > 400 && res.statusCode <= 500)
                {
                    return reject(new Error(`status code ${res.statusCode}`));
                }
                res.pipe(file);

                res.on('end', () => {
                    try
                    {
                        console.log("File obtained")
                    }
                    catch (error)
                    {
                        reject(error)
                    }
                    resolve(zipPath);
                });

                file.on("finish", () => {
                    file.close();
                    console.log(`Zip file downloaded to ${zipPath}`);
                });
            });
        });
    }
}