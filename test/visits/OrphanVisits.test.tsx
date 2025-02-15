import { screen } from '@testing-library/react';
import { formatISO } from 'date-fns';
import { MemoryRouter } from 'react-router-dom';
import { Mock } from 'ts-mockery';
import type { ReportExporter } from '../../src/common/services/ReportExporter';
import type { MercureBoundProps } from '../../src/mercure/helpers/boundToMercureHub';
import type { Settings } from '../../src/settings/reducers/settings';
import { OrphanVisits as createOrphanVisits } from '../../src/visits/OrphanVisits';
import type { VisitsInfo } from '../../src/visits/reducers/types';
import type { Visit } from '../../src/visits/types';
import { renderWithEvents } from '../__helpers__/setUpTest';

describe('<OrphanVisits />', () => {
  const getOrphanVisits = jest.fn();
  const exportVisits = jest.fn();
  const orphanVisits = Mock.of<VisitsInfo>({ visits: [Mock.of<Visit>({ date: formatISO(new Date()) })] });
  const OrphanVisits = createOrphanVisits(Mock.of<ReportExporter>({ exportVisits }));
  const setUp = () => renderWithEvents(
    <MemoryRouter>
      <OrphanVisits
        {...Mock.of<MercureBoundProps>({ mercureInfo: {} })}
        getOrphanVisits={getOrphanVisits}
        orphanVisits={orphanVisits}
        cancelGetOrphanVisits={jest.fn()}
        settings={Mock.all<Settings>()}
      />
    </MemoryRouter>,
  );

  it('wraps visits stats and header', () => {
    setUp();
    expect(screen.getByRole('heading', { name: 'Orphan visits' })).toBeInTheDocument();
    expect(getOrphanVisits).toHaveBeenCalled();
  });

  it('exports visits when clicking the button', async () => {
    const { user } = setUp();
    const btn = screen.getByRole('button', { name: 'Export (1)' });

    expect(exportVisits).not.toHaveBeenCalled();
    expect(btn).toBeInTheDocument();

    await user.click(btn);
    expect(exportVisits).toHaveBeenCalledWith('orphan_visits.csv', expect.anything());
  });
});
