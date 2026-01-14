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
const core = __importStar(require("@actions/core"));
const BlackDuckNotice_1 = require("./services/BlackDuckNotice");
async function run() {
    try {
        const bdUrl = core.getInput('blackduck-url', { required: true });
        const bdTokenInput = core.getInput('blackduck-token', { required: false });
        const bdTokenEnv = process.env.BLACKDUCK_TOKEN;
        const bdProjectName = core.getInput('project-name', { required: true });
        const bdVersionName = core.getInput('version-name', { required: true });
        const noticeFilePath = core.getInput('notice-file-path', { required: false }) || 'oss-notice-file.txt';
        const localNoticeFileDirectory = core.getInput('local-notice-file-directory', { required: false }) || 'false';
        const generateNoticeFile = core.getBooleanInput('generate-notice-file', { required: false });
        const getLatestNoticeFile = core.getBooleanInput('get-latest-notice-file', { required: false });
        const modifyNoticeFile = core.getBooleanInput('modify-notice-file', { required: false });
        const bdToken = bdTokenInput || bdTokenEnv;
        if (!bdToken) {
            core.setFailed('Authentication required: Provide blackduck-token input or set BLACKDUCK_TOKEN environment variable');
            return;
        }
        const normalizedUrl = bdUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        core.setSecret(bdToken);
        core.info('Configuring Black Duck Notice Generator:');
        core.info(`  Black Duck URL: ${normalizedUrl}`);
        core.info(`  Project Name: ${bdProjectName}`);
        core.info(`  Version Name: ${bdVersionName}`);
        core.info(`  Notice File Path: ${noticeFilePath}`);
        const blackduckNotice = new BlackDuckNotice_1.BlackDuckNotice(bdToken, bdProjectName, bdVersionName, normalizedUrl);
        if (modifyNoticeFile) {
            core.info('Modifying notice file...');
            await blackduckNotice.modifyNoticeFile(localNoticeFileDirectory, noticeFilePath);
            core.info(`Successfully modified notice file at ${noticeFilePath}`);
        }
        if (generateNoticeFile) {
            core.info('Generating new notice file in Black Duck...');
            await blackduckNotice.createNoticeFile();
            core.info('Successfully triggered notice file generation in Black Duck');
        }
        if (getLatestNoticeFile) {
            core.info('Downloading latest notice file from Black Duck...');
            await blackduckNotice.getLatestNoticeFile(noticeFilePath);
            core.info(`Successfully downloaded notice file to ${noticeFilePath}`);
        }
        if (!modifyNoticeFile && !generateNoticeFile && !getLatestNoticeFile) {
            core.warning('No operations selected. Set at least one of: generate-notice-file, get-latest-notice-file, or modify-notice-file to true');
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Action failed: ${error.message}`);
        }
        else {
            core.setFailed(`Action failed: ${String(error)}`);
        }
    }
}
run();
