import React, { useEffect, useState } from 'react';
import { apiCall } from '@/store/utils';
import { endpoints } from '@/store/urls';
import stl from './RefereeMatchTable.module.scss';
import toast from 'react-hot-toast';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';

const RefereeMatchTable = ({ tournamentId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({ team1Score: 0, team2Score: 0 });
  const [modalType, setModalType] = useState('start'); // 'start' or 'completed'
  
  // Walkover dialog state
  const [walkoverModalMatch, setWalkoverModalMatch] = useState(null);
  const [walkoverWinner, setWalkoverWinner] = useState('');
  const [walkoverReason, setWalkoverReason] = useState('');
  const [submittingWalkover, setSubmittingWalkover] = useState(false);

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

  const handleStartMatch = async (match) => {
    try {
      await apiCall(`${endpoints.updateMatchStatus}/${match.match_id}`, {
        method: "POST",
        body: {
          tournament_id: tournamentId,
          status: "on-going"
        }
      });
      
      // Update local state
      setMatches(matches.map(m => 
        m.match_id === match.match_id 
          ? { ...m, match_status: { ...m.match_status, status: 'on-going' }} 
          : m
      ));
      
      toast.success("Match started successfully");
    } catch (error) {
      console.error("Failed to start match:", error);
      toast.error(error.message || "Failed to start match");
    }
  };

  const handleScoreUpdate = async (match, isFinal = false, override = false) => {
    try {
      const requestBody = {
        tournament_id: tournamentId,
        match_id: match.match_id,
        score: `${scores.team1Score}-${scores.team2Score}`,
        final: isFinal,
        override: override
      };

      const scorePromise = fetch(endpoints.updateMatchScore, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
      });

      const statusPromise = isFinal ? 
        apiCall(`${endpoints.updateMatchStatus}/${match.match_id}`, {
          method: "POST",
          body: {
            tournament_id: tournamentId,
            status: "completed"
          }
        }) : Promise.resolve();

      const [response] = await Promise.all([scorePromise, statusPromise]);
      const resp = await response.json();

      if (!response.ok) {
        if (response.status === 400 && resp.error?.includes("already been finalized")) {
          const shouldOverride = window.confirm("Match is already finalized. Would you like to override?");
          if (shouldOverride) {
            return handleScoreUpdate(match, isFinal, true);
          }
        }
        throw new Error(resp.error || 'Failed to update score');
      }

      // Update local state
      setMatches(matches.map(m => {
        if (m.match_id === match.match_id) {
          return {
            ...m,
            match_result: `${scores.team1Score}-${scores.team2Score}`,
            match_status: isFinal 
              ? { 
                  ...m.match_status, 
                  status: 'completed', 
                  is_final: true, 
                  winner_team_id: resp.winner_team_id,
                  outcome_type: resp.outcome_type || 'regular',
                  outcome_details: resp.outcome_details
                }
              : m.match_status
          };
        }
        return m;
      }));

      setEditingMatch(null);
      toast.success(isFinal ? 'Match finalized successfully' : 'Score updated successfully');
    } catch (error) {
      console.error('Failed to update score:', error);
      toast.error(error.message || 'Failed to update score');
    }
  };

  const handleAwardWalkover = async () => {
    if (!walkoverWinner || !walkoverModalMatch) {
      toast.error('Please select the winning team');
      return;
    }

    try {
      setSubmittingWalkover(true);
      const url = endpoints.matchOutcome || `${endpoints.getBaseUrl()}/match/outcome`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: walkoverModalMatch.match_id,
          tournament_id: tournamentId,
          outcome_type: 'walkover',
          winner_team_id: walkoverWinner,
          details: walkoverReason || 'Walkover awarded by referee',
          override: true
        })
      });

      const resp = await response.json();
      if (!response.ok) {
        throw new Error(resp.error || 'Failed to award walkover');
      }

      // Update local state
      setMatches(matches.map(m => {
        if (m.match_id === walkoverModalMatch.match_id) {
          return {
            ...m,
            match_result: '0-0',
            match_status: {
              ...m.match_status,
              status: 'completed',
              is_final: true,
              winner_team_id: resp.winner_team_id,
              outcome_type: 'walkover',
              outcome_details: resp.outcome_details
            }
          };
        }
        return m;
      }));

      toast.success('Walkover awarded successfully!');
      setWalkoverModalMatch(null);
      setWalkoverWinner('');
      setWalkoverReason('');
    } catch (error) {
      console.error('Failed to award walkover:', error);
      toast.error(error.message || 'Failed to award walkover');
    } finally {
      setSubmittingWalkover(false);
    }
  };

  const handleEditClick = (match) => {
    if (match.match_status.status === 'completed') {
      setSelectedMatch(match);
      setModalType('completed');
      setShowStatusModal(true);
      return;
    }

    const [team1Score, team2Score] = match.match_result ? match.match_result.split('-').map(Number) : [0, 0];
    setScores({ team1Score: team1Score || 0, team2Score: team2Score || 0 });
    setEditingMatch(match);
  };

  const handleStartMatchClick = (match) => {
    setSelectedMatch(match);
    setModalType('start');
    setShowStatusModal(true);
  };

  const openWalkoverModal = (match) => {
    setWalkoverModalMatch(match);
    setWalkoverWinner(match.team1?.team_id || match.team1_id || '');
    setWalkoverReason('');
  };

  if (loading) {
    return <div className={stl.loading}>Loading matches...</div>;
  }

  return (
    <div className={stl.container}>
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
              <th>Actions</th>
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
                  <td style={isWalkover && match.match_status?.winner_team_id === (match.team1?.team_id || match.team1_id) ? { fontWeight: 'bold', color: '#2e7d32' } : {}}>
                    {match.team1_players}
                    {isWalkover && match.match_status?.winner_team_id === (match.team1?.team_id || match.team1_id) && ' (Winner)'}
                  </td>
                  <td style={isWalkover && match.match_status?.winner_team_id === (match.team2?.team_id || match.team2_id) ? { fontWeight: 'bold', color: '#2e7d32' } : {}}>
                    {match.team2_players}
                    {isWalkover && match.match_status?.winner_team_id === (match.team2?.team_id || match.team2_id) && ' (Winner)'}
                  </td>
                  <td>
                    {isWalkover ? (
                      <span className={stl.walkoverResult} title={match.match_status.outcome_details || 'Walkover'}>
                        W/O
                      </span>
                    ) : editingMatch?.match_id === match.match_id ? (
                      <div className={stl.scoreInputs}>
                        <TextField
                          size="small"
                          type="number"
                          value={scores.team1Score}
                          onChange={(e) => setScores({ ...scores, team1Score: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                        <span>-</span>
                        <TextField
                          size="small"
                          type="number"
                          value={scores.team2Score}
                          onChange={(e) => setScores({ ...scores, team2Score: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                      </div>
                    ) : (
                      match.match_result
                    )}
                  </td>
                  <td>
                    <span className={`${stl.status} ${isWalkover ? stl.walkoverStatus : stl[match.match_status.status]}`}>
                      {isWalkover ? 'Walkover' : match.match_status.status}
                    </span>
                  </td>
                  <td>
                    {match.match_status.status === 'pending' && (
                      <div className={stl.actionButtons}>
                        <button 
                          onClick={() => handleStartMatchClick(match)}
                          className={stl.startButton}
                        >
                          Start Match
                        </button>
                        <button
                          onClick={() => openWalkoverModal(match)}
                          className={stl.walkoverButton}
                        >
                          Award Walkover
                        </button>
                      </div>
                    )}
                    {match.match_status.status === 'on-going' && (
                      editingMatch?.match_id === match.match_id ? (
                        <div className={stl.actionButtons}>
                          <button 
                            onClick={() => handleScoreUpdate(match)}
                            className={stl.updateButton}
                          >
                            Update
                          </button>
                          <button 
                            onClick={() => handleScoreUpdate(match, true)}
                            className={stl.finalizeButton}
                          >
                            Finalize
                          </button>
                          <button 
                            onClick={() => setEditingMatch(null)}
                            className={stl.cancelButton}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className={stl.actionButtons}>
                          <button 
                            onClick={() => handleEditClick(match)}
                            className={stl.editButton}
                          >
                            Edit Score
                          </button>
                          <button
                            onClick={() => openWalkoverModal(match)}
                            className={stl.walkoverButton}
                          >
                            Award Walkover
                          </button>
                        </div>
                      )
                    )}
                    {match.match_status.status === 'completed' && (
                      <div className={stl.actionButtons}>
                        <button 
                          onClick={() => handleEditClick(match)}
                          className={stl.editButton}
                        >
                          Override Score
                        </button>
                        <button
                          onClick={() => openWalkoverModal(match)}
                          className={stl.walkoverButton}
                        >
                          Change Walkover
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Start / Override Modal */}
      <Dialog 
        open={showStatusModal} 
        onClose={() => setShowStatusModal(false)}
      >
        <DialogTitle>
          {modalType === 'start' ? 'Start Match' : 'Match Completed'}
        </DialogTitle>
        <DialogContent>
          {modalType === 'start' ? (
            <p>Are you sure you want to start this match?</p>
          ) : (
            <p>This match has been completed. Would you like to override the scores?</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowStatusModal(false)}
            style={{ color: '#F28C28' }}
          >
            Cancel
          </Button>
          {modalType === 'start' ? (
            <Button 
              onClick={() => {
                handleStartMatch(selectedMatch);
                setShowStatusModal(false);
              }}
              style={{ color: '#4CAF50' }}
            >
              Start Match
            </Button>
          ) : (
            <Button 
              onClick={() => {
                const [team1Score, team2Score] = selectedMatch.match_result ? selectedMatch.match_result.split('-').map(Number) : [0, 0];
                setScores({ team1Score: team1Score || 0, team2Score: team2Score || 0 });
                setEditingMatch(selectedMatch);
                setShowStatusModal(false);
              }}
              style={{ color: '#4CAF50' }}
            >
              Override Score
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Walkover Modal */}
      <Dialog
        open={Boolean(walkoverModalMatch)}
        onClose={() => setWalkoverModalMatch(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Award Walkover (Match #{walkoverModalMatch?.match_id})</DialogTitle>
        <DialogContent>
          <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
            Select the winning team. The match will be finalized with a walkover (0-0 score).
          </p>
          {walkoverModalMatch && (
            <div>
              <div 
                className={`${stl.walkoverTeamOption} ${walkoverWinner === (walkoverModalMatch.team1?.team_id || walkoverModalMatch.team1_id) ? stl.selected : ''}`}
                onClick={() => setWalkoverWinner(walkoverModalMatch.team1?.team_id || walkoverModalMatch.team1_id)}
              >
                <strong>Team 1: {walkoverModalMatch.team1_players}</strong>
                {walkoverWinner === (walkoverModalMatch.team1?.team_id || walkoverModalMatch.team1_id) && ' ✓ Winner'}
              </div>
              <div 
                className={`${stl.walkoverTeamOption} ${walkoverWinner === (walkoverModalMatch.team2?.team_id || walkoverModalMatch.team2_id) ? stl.selected : ''}`}
                onClick={() => setWalkoverWinner(walkoverModalMatch.team2?.team_id || walkoverModalMatch.team2_id)}
              >
                <strong>Team 2: {walkoverModalMatch.team2_players}</strong>
                {walkoverWinner === (walkoverModalMatch.team2?.team_id || walkoverModalMatch.team2_id) && ' ✓ Winner'}
              </div>

              <TextField
                fullWidth
                size="small"
                label="Reason (optional)"
                placeholder="e.g. No-show, injury"
                value={walkoverReason}
                onChange={(e) => setWalkoverReason(e.target.value)}
                style={{ marginTop: '0.5rem' }}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWalkoverModalMatch(null)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleAwardWalkover}
            disabled={submittingWalkover || !walkoverWinner}
            style={{ backgroundColor: '#f57c00', color: 'white' }}
            variant="contained"
          >
            {submittingWalkover ? 'Awarding...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RefereeMatchTable;
