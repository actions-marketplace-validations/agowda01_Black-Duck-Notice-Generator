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
exports.BlackDuckAPICalls = void 0;
const https = __importStar(require("https"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class BlackDuckAPICalls {
    constructor(_bdToken, _bdProjectName, _bdVersionName, _baseUrl) {
        this.bdToken = _bdToken;
        this.bdProjectName = _bdProjectName;
        this.bdVersionName = _bdVersionName;
        this.baseUrl = _baseUrl.replace(/^https:\/\//, "").replace(/\/$/, '');
    }
    async authenticate(_baseUrl, _bdToken) {
        console.log("Authenticating...");
        let options = {
            hostname: _baseUrl,
            port: 443,
            path: '/api/tokens/authenticate',
            method: 'POST',
            headers: {
                'Authorization': `token ${this.bdToken}`,
                'Accept': 'application/vnd.blackducksoftware.user-4+json'
            }
        };
        let bearerResponse = await this.request(options);
        return bearerResponse.bearerToken;
    }
    async getProjects(_url, _bearerToken) {
        console.log("Get Projects...");
        let options = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.project-detail-4+json'
            }
        };
        return await this.getRequest(_url, options);
    }
    async getVersions(_url, _bearerToken) {
        console.log("Get Versions...");
        let options = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.project-detail-5+json'
            }
        };
        return await this.getRequest(_url, options);
    }
    async postNotice(_path, _bearerToken) {
        console.log("Create Notice File...");
        let options = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Content-Type': 'application/vnd.blackducksoftware.report-5+json',
                'Accept': 'application/vnd.blackducksoftware.report-5+json'
            },
            method: 'POST',
            hostname: this.baseUrl,
            path: _path
        };
        const versionId = [8, 4, 4, 4, 12].map(n => crypto.randomBytes(n / 2).toString("hex")).join("-");
        let requestBody = {
            reportFormat: 'TEXT',
            locale: 'en_US',
            versionId: versionId,
            categories: ['LICENSE_DATA', 'LICENSE_TEXT'],
            reportType: 'VERSION_LICENSE',
            includeSubprojects: true
        };
        return await this.request(options, JSON.stringify(requestBody));
    }
    async getReportContent(_url, _bearerToken, noticeFilePath) {
        console.log("Get Report Content...");
        let options = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.report-4+json'
            }
        };
        return await this.downloadFile(_url, options, noticeFilePath);
    }
    async getAltReportContent(malformedBody) {
        const regex = /\"fileContent\":\"(.*)\",\"fileNamePrefix\"/;
        const getContent = malformedBody.match(regex);
        const resp = {
            reportContent: [{
                    fileName: "malformedlicense.txt",
                    fileContent: getContent[1],
                    fileNamePrefix: "malformedlicense"
                }]
        };
        return resp;
    }
    async getReportDetails(_url, _bearerToken) {
        console.log("Get Report Details...");
        let options = {
            port: 443,
            headers: {
                'Authorization': `Bearer ${_bearerToken}`,
                'Accept': 'application/vnd.blackducksoftware.report-4+json'
            }
        };
        return await this.getRequest(_url, options);
    }
    async request(options, data) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode > 400 && res.statusCode <= 500) {
                    return reject(new Error(`status code ${res.statusCode}`));
                }
                let body = [];
                let response;
                res.on('data', (data) => {
                    body.push(data);
                });
                res.on('end', () => {
                    try {
                        if (body.length > 0) {
                            response = JSON.parse(Buffer.concat(body).toString());
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                    resolve(response);
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            if (data != null) {
                try {
                    req.write(data);
                }
                catch (error) {
                    resolve(error);
                }
            }
            req.end();
        });
    }
    async getRequest(url, options, errorProcess) {
        return new Promise((resolve, reject) => {
            const req = https.get(url, options, (res) => {
                if (res.statusCode > 400 && res.statusCode <= 500) {
                    return reject(new Error(`status code ${res.statusCode}`));
                }
                let body = [];
                let response;
                res.on('data', (data) => {
                    body.push(data);
                });
                res.on('end', () => {
                    try {
                        response = JSON.parse(Buffer.concat(body).toString());
                    }
                    catch (error) {
                        if (errorProcess != null) {
                            response = errorProcess(Buffer.concat(body).toString());
                        }
                        else {
                            reject(error);
                        }
                    }
                    resolve(response);
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.end();
        });
    }
    async downloadFile(url, options, noticeFilePath) {
        return new Promise((resolve, reject) => {
            const zipPath = `${path.dirname(noticeFilePath)}/bdlicense.zip`;
            const file = fs.createWriteStream(zipPath);
            const req = https.get(url, options, (res) => {
                if (res.statusCode > 400 && res.statusCode <= 500) {
                    return reject(new Error(`status code ${res.statusCode}`));
                }
                res.pipe(file);
                res.on('end', () => {
                    try {
                        console.log("File obtained");
                    }
                    catch (error) {
                        reject(error);
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
exports.BlackDuckAPICalls = BlackDuckAPICalls;
