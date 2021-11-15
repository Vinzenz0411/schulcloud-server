import { Test, TestingModule } from '@nestjs/testing';
import { DashboardEntity, EntityId, GridPosition, GridElement, DefaultGridReference } from '@shared/domain';
import { DashboardUc } from '../uc/dashboard.uc';
import { DashboardController } from './dashboard.controller';
import { DashboardResponse } from './dto';

describe('dashboard uc', () => {
	let uc: DashboardUc;
	let controller: DashboardController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [],
			providers: [
				DashboardController,
				{
					provide: DashboardUc,
					useValue: {
						getUsersDashboard(): Promise<DashboardEntity> {
							throw new Error('Please write a mock for DashboardRepo.getUsersDashboard.');
						},
						moveElementOnDashboard(dashboardId: EntityId, from: GridPosition, to: GridPosition) {
							throw new Error('Please write a mock for DashboardRepo.getUsersDashboard.');
						},
						renameGroupOnDashboard(dashboardId: EntityId, position: GridPosition, title: string) {
							throw new Error('Please write a mock for DashboardRepo.getUsersDashboard.');
						},
					},
				},
			],
		}).compile();

		uc = module.get(DashboardUc);
		controller = module.get(DashboardController);
	});

	describe('getUsersDashboard', () => {
		it('should return a dashboard', async () => {
			jest.spyOn(uc, 'getUsersDashboard').mockImplementation(() => {
				const dashboard = new DashboardEntity('someid', { grid: [] });
				return Promise.resolve(dashboard);
			});
			const response = await controller.findForUser();

			expect(response instanceof DashboardResponse).toEqual(true);
		});

		it('should return a dashboard with a group', async () => {
			jest.spyOn(uc, 'getUsersDashboard').mockImplementation(() => {
				const dashboard = new DashboardEntity('someid', {
					grid: [
						{
							pos: { x: 1, y: 3 },
							gridElement: GridElement.FromPersistedGroup('elementId', 'groupTitle', [
								new DefaultGridReference('firstId', 'Math'),
								new DefaultGridReference('secondId', 'German'),
							]),
						},
					],
				});
				return Promise.resolve(dashboard);
			});

			const response = await controller.findForUser();
			expect(response instanceof DashboardResponse).toEqual(true);
			expect(response.gridElements[0]).toHaveProperty('groupElements');
		});
	});

	describe('moveElement', () => {
		it('should call uc', async () => {
			const spy = jest
				.spyOn(uc, 'moveElementOnDashboard')
				.mockImplementation((dashboardId: EntityId, from: GridPosition, to: GridPosition) => {
					const dashboard = new DashboardEntity(dashboardId, {
						grid: [
							{
								pos: to,
								gridElement: GridElement.FromPersistedReference(
									'elementId',
									new DefaultGridReference('referenceId', 'Mathe')
								),
							},
						],
					});
					return Promise.resolve(dashboard);
				});
			await controller.moveElement('dashboardId', { from: { x: 1, y: 2 }, to: { x: 2, y: 1 } });
			expect(spy).toHaveBeenCalledWith('dashboardId', { x: 1, y: 2 }, { x: 2, y: 1 });
		});

		it('should return a dashboard', async () => {
			jest
				.spyOn(uc, 'moveElementOnDashboard')
				.mockImplementation((dashboardId: EntityId, from: GridPosition, to: GridPosition) => {
					const dashboard = new DashboardEntity(dashboardId, {
						grid: [
							{
								pos: to,
								gridElement: GridElement.FromPersistedReference(
									'elementId',
									new DefaultGridReference('referenceId', 'Mathe')
								),
							},
						],
					});
					return Promise.resolve(dashboard);
				});
			const response = await controller.moveElement('dashboardId', { from: { x: 1, y: 2 }, to: { x: 2, y: 1 } });
			expect(response instanceof DashboardResponse).toEqual(true);
		});
	});

	describe('patchGroup', () => {
		it('should call uc', async () => {
			const spy = jest
				.spyOn(uc, 'renameGroupOnDashboard')
				.mockImplementation((dashboardId: EntityId, position: GridPosition, title: string) => {
					const dashboard = new DashboardEntity(dashboardId, {
						grid: [
							{
								pos: position,
								gridElement: GridElement.FromPersistedGroup('elementId', 'originalTitle', [
									new DefaultGridReference('referenceId1', 'Math'),
									new DefaultGridReference('referenceId2', 'German'),
								]),
							},
						],
					});
					return Promise.resolve(dashboard);
				});
			await controller.patchGroup('dashboardId', 3, 4, { title: 'groupTitle' });
			expect(spy).toHaveBeenCalledWith('dashboardId', { x: 3, y: 4 }, 'groupTitle');
		});

		it('should return a dashboard', async () => {
			jest
				.spyOn(uc, 'renameGroupOnDashboard')
				.mockImplementation((dashboardId: EntityId, position: GridPosition, title: string) => {
					const dashboard = new DashboardEntity(dashboardId, {
						grid: [
							{
								pos: position,
								gridElement: GridElement.FromPersistedGroup('elementId', 'originalTitle', [
									new DefaultGridReference('referenceId1', 'Math'),
									new DefaultGridReference('referenceId2', 'German'),
								]),
							},
						],
					});
					return Promise.resolve(dashboard);
				});
			const response = await controller.patchGroup('dashboardId', 3, 4, { title: 'groupTitle' });
			expect(response instanceof DashboardResponse).toEqual(true);
		});
	});
});