/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Docker from 'dockerode';
import { ContainerDesc } from 'dockerode';
import vscode = require('vscode');
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { throwDockerConnectionError } from '../../explorer/utils/dockerConnectionError';
import { ext } from '../../extensionVariables';
import { docker } from './docker-endpoint';

export interface ContainerItem extends vscode.QuickPickItem {
    label: string;
    containerDesc: Docker.ContainerDesc;
    allContainers: boolean;
}

function createItem(container: Docker.ContainerDesc): ContainerItem {
    return <ContainerItem>{
        label: container.Image,
        containerDesc: container
    };
}

function computeItems(containers: Docker.ContainerDesc[], includeAll: boolean): ContainerItem[] {
    const items: ContainerItem[] = [];

    for (let container of containers) {
        const item = createItem(container);
        items.push(item);
    }

    if (includeAll && containers.length > 0) {
        items.unshift(<ContainerItem>{
            label: 'All containers',
            allContainers: true
        });
    }

    return items;
}

export async function quickPickContainer(actionContext: IActionContext, includeAll: boolean = false, opts?: {}): Promise<ContainerItem> {
    let properties: {
        allContainers?: string;
    } & TelemetryProperties = actionContext.properties;

    let containers: ContainerDesc[];

    // "status": ["created", "restarting", "running", "paused", "exited", "dead"]
    if (!opts) {
        opts = {
            "filters": {
                "status": ["running"]
            }
        };
    }

    try {
        containers = await docker.getContainerDescriptors(opts);
    } catch (err) {
        throwDockerConnectionError(actionContext, err);
    }

    if (containers.length === 0) {
        throw new Error('There are no Docker containers that apply to this command.');
    } else {
        const items: ContainerItem[] = computeItems(containers, includeAll);
        let response = await ext.ui.showQuickPick<ContainerItem>(items, { placeHolder: 'Choose container...' });
        properties.allContainers = includeAll ? String(response.allContainers) : undefined;
        return response;
    }
}
