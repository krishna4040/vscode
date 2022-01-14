/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/panelpart';
import { localize } from 'vs/nls';
import { KeyMod, KeyCode } from 'vs/base/common/keyCodes';
import { Action } from 'vs/base/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncActionDescriptor, MenuId, MenuRegistry, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IWorkbenchActionRegistry, Extensions as WorkbenchExtensions, CATEGORIES } from 'vs/workbench/common/actions';
import { IWorkbenchLayoutService, PanelAlignment, Parts, Position, positionToString } from 'vs/workbench/services/layout/browser/layoutService';
import { ActivityAction, ToggleCompositePinnedAction, ICompositeBar } from 'vs/workbench/browser/parts/compositeBarActions';
import { IActivity } from 'vs/workbench/common/activity';
import { ActivePanelContext, PanelMaximizedContext, PanelPositionContext, PanelVisibleContext } from 'vs/workbench/common/panel';
import { ContextKeyExpr, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { Codicon } from 'vs/base/common/codicons';
import { registerIcon } from 'vs/platform/theme/common/iconRegistry';
import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { ViewContainerLocationToString, ViewContainerLocation } from 'vs/workbench/common/views';
import { IPaneCompositePartService } from 'vs/workbench/services/panecomposite/browser/panecomposite';

const maximizeIcon = registerIcon('panel-maximize', Codicon.chevronUp, localize('maximizeIcon', 'Icon to maximize a panel.'));
const restoreIcon = registerIcon('panel-restore', Codicon.chevronDown, localize('restoreIcon', 'Icon to restore a panel.'));
const closeIcon = registerIcon('panel-close', Codicon.close, localize('closeIcon', 'Icon to close a panel.'));

export class TogglePanelAction extends Action {

	static readonly ID = 'workbench.action.togglePanel';
	static readonly LABEL = localize('togglePanel', "Toggle Panel");

	constructor(
		id: string,
		name: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, name, layoutService.isVisible(Parts.PANEL_PART) ? 'panel expanded' : 'panel');
	}

	override async run(): Promise<void> {
		this.layoutService.setPartHidden(this.layoutService.isVisible(Parts.PANEL_PART), Parts.PANEL_PART);
	}
}

class FocusPanelAction extends Action {

	static readonly ID = 'workbench.action.focusPanel';
	static readonly LABEL = localize('focusPanel', "Focus into Panel");

	constructor(
		id: string,
		label: string,
		@IPaneCompositePartService private readonly paneCompositeService: IPaneCompositePartService,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {

		// Show panel
		if (!this.layoutService.isVisible(Parts.PANEL_PART)) {
			this.layoutService.setPartHidden(false, Parts.PANEL_PART);
		}

		// Focus into active panel
		let panel = this.paneCompositeService.getActivePaneComposite(ViewContainerLocation.Panel);
		if (panel) {
			panel.focus();
		}
	}
}

const PositionPanelActionId = {
	LEFT: 'workbench.action.positionPanelLeft',
	RIGHT: 'workbench.action.positionPanelRight',
	BOTTOM: 'workbench.action.positionPanelBottom',
};

const AlignPanelActionId = {
	LEFT: 'workbench.action.alignPanelLeft',
	RIGHT: 'workbench.action.alignPanelRight',
	CENTER: 'workbench.action.alignPanelCenter',
	JUSTIFY: 'workbench.action.alignPanelJustify',
};

interface PanelActionConfig<T> {
	id: string;
	when: ContextKeyExpression;
	alias: string;
	label: string;
	shortLabel: string;
	value: T;
}

function createPanelActionConfig<T>(id: string, alias: string, label: string, shortLabel: string, value: T, when: ContextKeyExpression): PanelActionConfig<T> {
	return {
		id,
		alias,
		label,
		shortLabel,
		value,
		when,
	};
}

function createPositionPanelActionConfig(id: string, alias: string, label: string, shortLabel: string, position: Position): PanelActionConfig<Position> {
	return createPanelActionConfig<Position>(id, alias, label, shortLabel, position, PanelPositionContext.notEqualsTo(positionToString(position)));
}

function createAlignmentPanelActionConfig(id: string, alias: string, label: string, shortLabel: string, alignment: PanelAlignment): PanelActionConfig<PanelAlignment> {
	return createPanelActionConfig<PanelAlignment>(id, alias, label, shortLabel, alignment, ContextKeyExpr.notEquals('config.workbench.experimental.panel.alignment', alignment));
}


export const PositionPanelActionConfigs: PanelActionConfig<Position>[] = [
	createPositionPanelActionConfig(PositionPanelActionId.LEFT, 'View: Move Panel Left', localize('positionPanelLeft', 'Move Panel Left'), localize('positionPanelLeftShort', "Left"), Position.LEFT),
	createPositionPanelActionConfig(PositionPanelActionId.RIGHT, 'View: Move Panel Right', localize('positionPanelRight', 'Move Panel Right'), localize('positionPanelRightShort', "Right"), Position.RIGHT),
	createPositionPanelActionConfig(PositionPanelActionId.BOTTOM, 'View: Move Panel To Bottom', localize('positionPanelBottom', 'Move Panel To Bottom'), localize('positionPanelBottomShort', "Bottom"), Position.BOTTOM),
];


export const AlignPanelActionConfigs: PanelActionConfig<PanelAlignment>[] = [
	createAlignmentPanelActionConfig(AlignPanelActionId.LEFT, 'View: Align Panel Left', localize('alignPanelLeft', 'Align Panel Left'), localize('alignPanelLeftShort', "Left"), 'left'),
	createAlignmentPanelActionConfig(AlignPanelActionId.RIGHT, 'View: Align Panel Right', localize('alignPanelRight', 'Align Panel Right'), localize('alignPanelRightShort', "Right"), 'right'),
	createAlignmentPanelActionConfig(AlignPanelActionId.CENTER, 'View: Center Panel', localize('alignPanelCenter', 'Center Panel'), localize('alignPanelCenterShort', "Center"), 'center'),
	createAlignmentPanelActionConfig(AlignPanelActionId.JUSTIFY, 'View: Justify Panel', localize('alignPanelJustify', 'Justify Panel'), localize('alignPanelJustifyShort', "Justify"), 'justify'),
];

const positionByActionId = new Map(PositionPanelActionConfigs.map(config => [config.id, config.value]));
const alignmentByActionId = new Map(AlignPanelActionConfigs.map(config => [config.id, config.value]));

export class SetPanelPositionAction extends Action {
	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		const position = positionByActionId.get(this.id);
		this.layoutService.setPanelPosition(position === undefined ? Position.BOTTOM : position);
	}
}

export class SetPanelAlignmentAction extends Action {
	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		const alignment = alignmentByActionId.get(this.id);
		this.layoutService.setPanelAlignment(alignment === undefined ? 'center' : alignment);
	}
}

export class PanelActivityAction extends ActivityAction {

	constructor(
		activity: IActivity,
		private readonly viewContainerLocation: ViewContainerLocation,
		@IPaneCompositePartService private readonly paneCompositeService: IPaneCompositePartService
	) {
		super(activity);
	}

	override async run(): Promise<void> {
		await this.paneCompositeService.openPaneComposite(this.activity.id, this.viewContainerLocation, true);
		this.activate();
	}

	setActivity(activity: IActivity): void {
		this.activity = activity;
	}
}

export class PlaceHolderPanelActivityAction extends PanelActivityAction {

	constructor(
		id: string,
		viewContainerLocation: ViewContainerLocation,
		@IPaneCompositePartService paneCompositeService: IPaneCompositePartService
	) {
		super({ id, name: id }, viewContainerLocation, paneCompositeService);
	}
}

export class PlaceHolderToggleCompositePinnedAction extends ToggleCompositePinnedAction {

	constructor(id: string, compositeBar: ICompositeBar) {
		super({ id, name: id, cssClass: undefined }, compositeBar);
	}

	setActivity(activity: IActivity): void {
		this.label = activity.name;
	}
}

export class SwitchPanelViewAction extends Action {

	constructor(
		id: string,
		name: string,
		@IPaneCompositePartService private readonly paneCompositeService: IPaneCompositePartService
	) {
		super(id, name);
	}

	override async run(offset: number): Promise<void> {
		const pinnedPanels = this.paneCompositeService.getPinnedPaneCompositeIds(ViewContainerLocation.Panel);
		const activePanel = this.paneCompositeService.getActivePaneComposite(ViewContainerLocation.Panel);
		if (!activePanel) {
			return;
		}
		let targetPanelId: string | undefined;
		for (let i = 0; i < pinnedPanels.length; i++) {
			if (pinnedPanels[i] === activePanel.getId()) {
				targetPanelId = pinnedPanels[(i + pinnedPanels.length + offset) % pinnedPanels.length];
				break;
			}
		}
		if (typeof targetPanelId === 'string') {
			await this.paneCompositeService.openPaneComposite(targetPanelId, ViewContainerLocation.Panel, true);
		}
	}
}

export class PreviousPanelViewAction extends SwitchPanelViewAction {

	static readonly ID = 'workbench.action.previousPanelView';
	static readonly LABEL = localize('previousPanelView', 'Previous Panel View');

	constructor(
		id: string,
		name: string,
		@IPaneCompositePartService paneCompositeService: IPaneCompositePartService
	) {
		super(id, name, paneCompositeService);
	}

	override run(): Promise<void> {
		return super.run(-1);
	}
}

export class NextPanelViewAction extends SwitchPanelViewAction {

	static readonly ID = 'workbench.action.nextPanelView';
	static readonly LABEL = localize('nextPanelView', 'Next Panel View');

	constructor(
		id: string,
		name: string,
		@IPaneCompositePartService paneCompositeService: IPaneCompositePartService
	) {
		super(id, name, paneCompositeService);
	}

	override run(): Promise<void> {
		return super.run(1);
	}
}

const actionRegistry = Registry.as<IWorkbenchActionRegistry>(WorkbenchExtensions.WorkbenchActions);
actionRegistry.registerWorkbenchAction(SyncActionDescriptor.from(TogglePanelAction, { primary: KeyMod.CtrlCmd | KeyCode.KeyJ }), 'View: Toggle Panel', CATEGORIES.View.value);
actionRegistry.registerWorkbenchAction(SyncActionDescriptor.from(FocusPanelAction), 'View: Focus into Panel', CATEGORIES.View.value);
actionRegistry.registerWorkbenchAction(SyncActionDescriptor.from(PreviousPanelViewAction), 'View: Previous Panel View', CATEGORIES.View.value);
actionRegistry.registerWorkbenchAction(SyncActionDescriptor.from(NextPanelViewAction), 'View: Next Panel View', CATEGORIES.View.value);

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.toggleMaximizedPanel',
			title: { value: localize('toggleMaximizedPanel', "Toggle Maximized Panel"), original: 'Toggle Maximized Panel' },
			tooltip: localize('maximizePanel', "Maximize Panel Size"),
			category: CATEGORIES.View,
			f1: true,
			icon: maximizeIcon,
			toggled: { condition: PanelMaximizedContext, icon: restoreIcon, tooltip: localize('minimizePanel', "Restore Panel Size") },
			menu: [{
				id: MenuId.PanelTitle,
				group: 'navigation',
				order: 1
			}]
		});
	}
	run(accessor: ServicesAccessor) {
		const layoutService = accessor.get(IWorkbenchLayoutService);
		if (!layoutService.isVisible(Parts.PANEL_PART)) {
			layoutService.setPartHidden(false, Parts.PANEL_PART);
			// If the panel is not already maximized, maximize it
			if (!layoutService.isPanelMaximized()) {
				layoutService.toggleMaximizedPanel();
			}
		}
		else {
			layoutService.toggleMaximizedPanel();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.closePanel',
			title: { value: localize('closePanel', "Close Panel"), original: 'Close Panel' },
			category: CATEGORIES.View,
			icon: closeIcon,
			menu: [{
				id: MenuId.CommandPalette,
				when: PanelVisibleContext,
			}, {
				id: MenuId.PanelTitle,
				group: 'navigation',
				order: 2
			}]
		});
	}
	run(accessor: ServicesAccessor) {
		accessor.get(IWorkbenchLayoutService).setPartHidden(true, Parts.PANEL_PART);
	}
});

MenuRegistry.appendMenuItems([
	{
		id: MenuId.MenubarAppearanceMenu,
		item: {
			group: '2_workbench_layout',
			command: {
				id: TogglePanelAction.ID,
				title: localize({ key: 'miShowPanel', comment: ['&& denotes a mnemonic'] }, "Show &&Panel"),
				toggled: ActivePanelContext
			},
			order: 5
		}
	}, {
		id: MenuId.LayoutControlMenu,
		item: {
			group: '0_workbench_layout',
			command: {
				id: TogglePanelAction.ID,
				title: localize({ key: 'miShowPanel', comment: ['&& denotes a mnemonic'] }, "Show &&Panel"),
				toggled: ActivePanelContext
			},
			order: 4
		}
	}, {
		id: MenuId.ViewTitleContext,
		item: {
			group: '3_workbench_layout_move',
			command: {
				id: TogglePanelAction.ID,
				title: { value: localize('hidePanel', "Hide Panel"), original: 'Hide Panel' },
			},
			when: ContextKeyExpr.and(PanelVisibleContext, ContextKeyExpr.equals('viewLocation', ViewContainerLocationToString(ViewContainerLocation.Panel))),
			order: 2
		}
	}
]);

function registerPanelActionById(config: PanelActionConfig<PanelAlignment | Position>, descriptor: SyncActionDescriptor, parentMenu: MenuId) {
	const { id, label, shortLabel, alias, when } = config;
	// register the workbench action
	actionRegistry.registerWorkbenchAction(descriptor, alias, CATEGORIES.View.value, when);
	// register as a menu item
	MenuRegistry.appendMenuItems([{
		id: MenuId.MenubarAppearanceMenu,
		item: {
			group: '3_workbench_layout_move',
			command: {
				id,
				title: label
			},
			when,
			order: 5
		}
	}, {
		id: parentMenu,
		item: {
			command: {
				id,
				title: shortLabel,
				toggled: when.negate()
			},
			order: 5
		},
		}, {
		id: MenuId.ViewTitleContext,
		item: {
			group: '3_workbench_layout_move',
			command: {
				id: id,
				title: label,
			},
			when: ContextKeyExpr.and(when, ContextKeyExpr.equals('viewLocation', ViewContainerLocationToString(ViewContainerLocation.Panel))),
			order: 1
		}
	}]);
}

// register each position panel action
PositionPanelActionConfigs.forEach(config => registerPanelActionById(config, SyncActionDescriptor.create(SetPanelPositionAction, config.id, config.label), MenuId.LayoutControlPanelPositionMenu));
AlignPanelActionConfigs.forEach(config => registerPanelActionById(config, SyncActionDescriptor.create(SetPanelAlignmentAction, config.id, config.label), MenuId.LayoutControlPanelAlignmentMenu));
