import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ShlinkApiClientBuilder } from '../../api/services/ShlinkApiClientBuilder';
import type { ShlinkVisitsOverview } from '../../api/types';
import { createAsyncThunk } from '../../utils/helpers/redux';
import type { CreateVisit } from '../types';
import { groupNewVisitsByType } from '../types/helpers';
import { createNewVisits } from './visitCreation';

const REDUCER_PREFIX = 'shlink/visitsOverview';

export type PartialVisitsSummary = {
  total: number;
  nonBots?: number;
  bots?: number;
};

export type ParsedVisitsOverview = {
  nonOrphanVisits: PartialVisitsSummary;
  orphanVisits: PartialVisitsSummary;
};

export interface VisitsOverview extends ParsedVisitsOverview {
  loading: boolean;
  error: boolean;
}

export type GetVisitsOverviewAction = PayloadAction<ShlinkVisitsOverview>;

const initialState: VisitsOverview = {
  nonOrphanVisits: {
    total: 0,
  },
  orphanVisits: {
    total: 0,
  },
  loading: false,
  error: false,
};

const countBots = (visits: CreateVisit[]) => visits.filter(({ visit }) => visit.potentialBot).length;

export const loadVisitsOverview = (buildShlinkApiClient: ShlinkApiClientBuilder) => createAsyncThunk(
  `${REDUCER_PREFIX}/loadVisitsOverview`,
  (_: void, { getState }): Promise<ParsedVisitsOverview> => buildShlinkApiClient(getState).getVisitsOverview().then(
    (resp) => ({
      nonOrphanVisits: {
        total: resp.nonOrphanVisits?.total ?? resp.visitsCount,
        nonBots: resp.nonOrphanVisits?.nonBots,
        bots: resp.nonOrphanVisits?.bots,
      },
      orphanVisits: {
        total: resp.orphanVisits?.total ?? resp.orphanVisitsCount,
        nonBots: resp.orphanVisits?.nonBots,
        bots: resp.orphanVisits?.bots,
      },
    }),
  ),
);

export const visitsOverviewReducerCreator = (
  loadVisitsOverviewThunk: ReturnType<typeof loadVisitsOverview>,
) => createSlice({
  name: REDUCER_PREFIX,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadVisitsOverviewThunk.pending, () => ({ ...initialState, loading: true }));
    builder.addCase(loadVisitsOverviewThunk.rejected, () => ({ ...initialState, error: true }));
    builder.addCase(loadVisitsOverviewThunk.fulfilled, (_, { payload }) => ({ ...initialState, ...payload }));

    builder.addCase(createNewVisits, ({ nonOrphanVisits, orphanVisits, ...rest }, { payload }) => {
      const { nonOrphanVisits: newNonOrphanVisits, orphanVisits: newOrphanVisits } = groupNewVisitsByType(
        payload.createdVisits,
      );

      const newNonOrphanTotalVisits = newNonOrphanVisits.length;
      const newNonOrphanBotVisits = countBots(newNonOrphanVisits);
      const newNonOrphanNonBotVisits = newNonOrphanTotalVisits - newNonOrphanBotVisits;

      const newOrphanTotalVisits = newOrphanVisits.length;
      const newOrphanBotVisits = countBots(newOrphanVisits);
      const newOrphanNonBotVisits = newOrphanTotalVisits - newOrphanBotVisits;

      return {
        ...rest,
        nonOrphanVisits: {
          total: nonOrphanVisits.total + newNonOrphanTotalVisits,
          bots: nonOrphanVisits.bots && nonOrphanVisits.bots + newNonOrphanBotVisits,
          nonBots: nonOrphanVisits.nonBots && nonOrphanVisits.nonBots + newNonOrphanNonBotVisits,
        },
        orphanVisits: {
          total: orphanVisits.total + newOrphanTotalVisits,
          bots: orphanVisits.bots && orphanVisits.bots + newOrphanBotVisits,
          nonBots: orphanVisits.nonBots && orphanVisits.nonBots + newOrphanNonBotVisits,
        },
      };
    });
  },
});
