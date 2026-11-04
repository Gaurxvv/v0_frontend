import React, { useEffect, useState } from 'react';
import { apiCall } from '@/store/utils';
import { endpoints } from '@/store/urls';
import stl from './MatchTable.module.scss';
import toast from 'react-hot-toast';

const MatchTable = ({ tournamentId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await apiCall(endpoints.getFixtures, {
          params: { tournament_id: tournamentId }
        });

        if (response && response.matches) {
          setMatches(response.matches);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
        toast.error('Failed to load matches');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchMatches();
    }
  }, [tournamentId]);

  const exportToCSV = () => {
    try {
      // Define CSV headers
      const headers = [
        'Match ID',
        'Round',
        'Pool',
        'Team 1',
        'Team 2',
        'Result',
        'Status'
      ];

      // Convert matches to CSV rows
      const csvRows = matches.map(match => {
        const isWalkover = match.match_status?.outcome_type === 'walkover';
        return [
          match.match_id,
          match.round_name || `Round ${match.round_id}`,
          match.pool || '-',
          match.team1_players,
          match.team2_players,
          isWalkover ? 'W/O' : match.match_result,
          isWalkover ? 'walkover' : match.match_status?.status
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tournament_${tournamentId}_matches.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV file downloaded successfully');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export matches to CSV');
    }
  };

  if (loading) {
    return <div className={stl.loading}>Loading matches...</div>;
  }

  return (
    <div className={stl.container}>
      <div className={stl.header}>
        <button onClick={exportToCSV} className={stl.exportButton}>
          Export to CSV
        </button>
      </div>
      <div className={stl.tableWrapper}>
        <table className={stl.table}>
          <thead>
            <tr>
              <th>Match ID</th>
              <th>Round</th>
              <th>Pool</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th>Result</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => {
              const isWalkover = match.match_status?.outcome_type === 'walkover';
              return (
                <tr key={match.match_id}>
                  <td>{match.match_id}</td>
                  <td>{match.round_name || `Round ${match.round_id}`}</td>
                  <td>{match.pool || '-'}</td>
                  <td style={isWalkover && match.match_status?.winner_team_id === match.team1?.team_id ? { fontWeight: 'bold', color: '#2e7d32' } : {}}>
                    {match.team1_players}
                    {isWalkover && match.match_status?.winner_team_id === match.team1?.team_id && ' (Winner)'}
                  </td>
                  <td style={isWalkover && match.match_status?.winner_team_id === match.team2?.team_id ? { fontWeight: 'bold', color: '#2e7d32' } : {}}>
                    {match.team2_players}
                    {isWalkover && match.match_status?.winner_team_id === match.team2?.team_id && ' (Winner)'}
                  </td>
                  <td>
                    {isWalkover ? (
                      <span className={stl.walkoverResult} title={match.match_status?.outcome_details || 'Walkover'}>
                        W/O
                      </span>
                    ) : (
                      match.match_result
                    )}
                  </td>
                  <td>
                    <span className={`${stl.status} ${isWalkover ? stl.walkoverStatus : stl[match.match_status?.status]}`}>
                      {isWalkover ? 'Walkover' : match.match_status?.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchTable; 