import { addDays, formatISO, subDays } from 'date-fns';
import { Mock } from 'ts-mockery';
import type { ShlinkApiClient } from '../../../src/api/services/ShlinkApiClient';
import type { ShlinkVisits } from '../../../src/api/types';
import type { ShlinkState } from '../../../src/container/types';
import { formatIsoDate } from '../../../src/utils/helpers/date';
import type { DateInterval } from '../../../src/utils/helpers/dateIntervals';
import { rangeOf } from '../../../src/utils/utils';
import {
  getOrphanVisits as getOrphanVisitsCreator,
  orphanVisitsReducerCreator,
} from '../../../src/visits/reducers/orphanVisits';
import type { VisitsInfo } from '../../../src/visits/reducers/types';
import { createNewVisits } from '../../../src/visits/reducers/visitCreation';
import type { Visit } from '../../../src/visits/types';

describe('orphanVisitsReducer', () => {
  const now = new Date();
  const visitsMocks = rangeOf(2, () => Mock.all<Visit>());
  const getOrphanVisitsCall = jest.fn();
  const buildShlinkApiClientMock = () => Mock.of<ShlinkApiClient>({ getOrphanVisits: getOrphanVisitsCall });
  const getOrphanVisits = getOrphanVisitsCreator(buildShlinkApiClientMock);
  const { reducer, cancelGetVisits: cancelGetOrphanVisits } = orphanVisitsReducerCreator(getOrphanVisits);

  beforeEach(jest.clearAllMocks);

  describe('reducer', () => {
    const buildState = (data: Partial<VisitsInfo>) => Mock.of<VisitsInfo>(data);

    it('returns loading on GET_ORPHAN_VISITS_START', () => {
      const { loading } = reducer(buildState({ loading: false }), getOrphanVisits.pending('', {}));
      expect(loading).toEqual(true);
    });

    it('returns loadingLarge on GET_ORPHAN_VISITS_LARGE', () => {
      const { loadingLarge } = reducer(buildState({ loadingLarge: false }), getOrphanVisits.large());
      expect(loadingLarge).toEqual(true);
    });

    it('returns cancelLoad on GET_ORPHAN_VISITS_CANCEL', () => {
      const { cancelLoad } = reducer(buildState({ cancelLoad: false }), cancelGetOrphanVisits());
      expect(cancelLoad).toEqual(true);
    });

    it('stops loading and returns error on GET_ORPHAN_VISITS_ERROR', () => {
      const { loading, error } = reducer(
        buildState({ loading: true, error: false }),
        getOrphanVisits.rejected(null, '', {}),
      );

      expect(loading).toEqual(false);
      expect(error).toEqual(true);
    });

    it('return visits on GET_ORPHAN_VISITS', () => {
      const actionVisits = [Mock.all<Visit>(), Mock.all<Visit>()];
      const { loading, error, visits } = reducer(
        buildState({ loading: true, error: false }),
        getOrphanVisits.fulfilled({ visits: actionVisits }, '', {}),
      );

      expect(loading).toEqual(false);
      expect(error).toEqual(false);
      expect(visits).toEqual(actionVisits);
    });

    it.each([
      [{}, visitsMocks.length + 2],
      [
        Mock.of<VisitsInfo>({
          query: { endDate: formatIsoDate(subDays(now, 1)) ?? undefined },
        }),
        visitsMocks.length,
      ],
      [
        Mock.of<VisitsInfo>({
          query: { startDate: formatIsoDate(addDays(now, 1)) ?? undefined },
        }),
        visitsMocks.length,
      ],
      [
        Mock.of<VisitsInfo>({
          query: {
            startDate: formatIsoDate(subDays(now, 5)) ?? undefined,
            endDate: formatIsoDate(subDays(now, 2)) ?? undefined,
          },
        }),
        visitsMocks.length,
      ],
      [
        Mock.of<VisitsInfo>({
          query: {
            startDate: formatIsoDate(subDays(now, 5)) ?? undefined,
            endDate: formatIsoDate(addDays(now, 3)) ?? undefined,
          },
        }),
        visitsMocks.length + 2,
      ],
    ])('prepends new visits on CREATE_VISIT', (state, expectedVisits) => {
      const prevState = buildState({ ...state, visits: visitsMocks });
      const visit = Mock.of<Visit>({ date: formatIsoDate(now) ?? undefined });

      const { visits } = reducer(prevState, createNewVisits([{ visit }, { visit }]));

      expect(visits).toHaveLength(expectedVisits);
    });

    it('returns new progress on GET_ORPHAN_VISITS_PROGRESS_CHANGED', () => {
      const { progress } = reducer(undefined, getOrphanVisits.progressChanged(85));
      expect(progress).toEqual(85);
    });

    it('returns fallbackInterval on GET_ORPHAN_VISITS_FALLBACK_TO_INTERVAL', () => {
      const fallbackInterval: DateInterval = 'last30Days';
      const state = reducer(undefined, getOrphanVisits.fallbackToInterval(fallbackInterval));

      expect(state).toEqual(expect.objectContaining({ fallbackInterval }));
    });
  });

  describe('getOrphanVisits', () => {
    const dispatchMock = jest.fn();
    const getState = () => Mock.of<ShlinkState>({
      orphanVisits: { cancelLoad: false },
    });

    it.each([
      [undefined],
      [{}],
    ])('dispatches start and success when promise is resolved', async (query) => {
      const visits = visitsMocks.map((visit) => ({ ...visit, visitedUrl: '' }));
      getOrphanVisitsCall.mockResolvedValue({
        data: visits,
        pagination: {
          currentPage: 1,
          pagesCount: 1,
          totalItems: 1,
        },
      });

      await getOrphanVisits({ query })(dispatchMock, getState, {});

      expect(dispatchMock).toHaveBeenCalledTimes(2);
      expect(dispatchMock).toHaveBeenLastCalledWith(expect.objectContaining({
        payload: { visits, query: query ?? {} },
      }));
      expect(getOrphanVisitsCall).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        [Mock.of<Visit>({ date: formatISO(subDays(now, 5)) })],
        getOrphanVisits.fallbackToInterval('last7Days'),
        3,
      ],
      [
        [Mock.of<Visit>({ date: formatISO(subDays(now, 200)) })],
        getOrphanVisits.fallbackToInterval('last365Days'),
        3,
      ],
      [[], expect.objectContaining({ type: getOrphanVisits.fulfilled.toString() }), 2],
    ])('dispatches fallback interval when the list of visits is empty', async (
      lastVisits,
      expectedSecondDispatch,
      expectedDispatchCalls,
    ) => {
      const buildVisitsResult = (data: Visit[] = []): ShlinkVisits => ({
        data,
        pagination: {
          currentPage: 1,
          pagesCount: 1,
          totalItems: 1,
        },
      });
      getOrphanVisitsCall
        .mockResolvedValueOnce(buildVisitsResult())
        .mockResolvedValueOnce(buildVisitsResult(lastVisits));

      await getOrphanVisits({ doIntervalFallback: true })(dispatchMock, getState, {});

      expect(dispatchMock).toHaveBeenCalledTimes(expectedDispatchCalls);
      expect(dispatchMock).toHaveBeenNthCalledWith(2, expectedSecondDispatch);
      expect(getOrphanVisitsCall).toHaveBeenCalledTimes(2);
    });
  });
});
