import React, { useState, useEffect } from 'react';
import { statisticsAPI, wordAPI } from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaAward, FaBullseye, FaBook, FaArrowUp, FaClock, FaHourglassHalf } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState(null);
  const [wordDatabases, setWordDatabases] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResponse, badgesResponse] = await Promise.all([
        statisticsAPI.getOverview(),
        statisticsAPI.getBadges()
      ]);
      
      setStats(statsResponse.data.data);
      setBadges(badgesResponse.data.data);
      
      // Load word database statistics
      await loadWordDatabaseStats();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWordDatabaseStats = async () => {
    try {
      // Get all sources
      const sourcesResponse = await wordAPI.getSources();
      const allSources = sourcesResponse.data.sources || [];
      
      // Log sources for debugging
      console.log('All sources:', allSources.map(s => s.sourceName));
      
      // Define the databases we want to track with flexible matching
      const databaseConfig = {
        'Kaggle -10000': {
          patterns: ['kaggle', '10000'],
          sourceIds: []
        },
        'Gemini': {
          patterns: ['gemini'],
          sourceIds: []
        },
        'Oxford-3000': {
          patterns: ['oxford', '3000'],
          sourceIds: []
        },
        'Oxford-5000': {
          patterns: ['oxford', '5000'],
          sourceIds: []
        }
      };
      
      // Find matching sources for each database
      for (const [dbName, config] of Object.entries(databaseConfig)) {
        const matchingSources = allSources.filter(s => {
          if (!s.sourceName) return false;
          const sourceNameLower = s.sourceName.toLowerCase();
          return config.patterns.every(pattern => 
            sourceNameLower.includes(pattern.toLowerCase())
          );
        });
        
        config.sourceIds = matchingSources.map(s => s._id);
        console.log(`${dbName} matched sources:`, matchingSources.map(s => s.sourceName));
      }
      
      // Fetch all words and calculate stats
      const databaseStats = {};
      
      for (const [dbName, config] of Object.entries(databaseConfig)) {
        let totalWords = 0;
        let knownWords = 0;
        
        if (config.sourceIds.length > 0) {
          // Fetch all words for matching sources
          for (const sourceId of config.sourceIds) {
            try {
              let currentPage = 1;
              let hasMore = true;
              
              while (hasMore) {
                const response = await wordAPI.getWordsWithStatus({
                  page: currentPage,
                  limit: 1000,
                  sourceId: sourceId,
                  showKnown: 'true',
                  showUnknown: 'true'
                });
                
                const words = response.data.words || [];
                totalWords += words.length;
                knownWords += words.filter(w => w.isKnown === true).length;
                
                const totalPages = response.data.pagination?.pages || 1;
                if (currentPage >= totalPages || words.length === 0) {
                  hasMore = false;
                } else {
                  currentPage++;
                }
              }
            } catch (error) {
              console.error(`Error loading words for ${dbName} (sourceId: ${sourceId}):`, error);
            }
          }
        }
        
        databaseStats[dbName] = {
          known: knownWords,
          total: totalWords
        };
        
        console.log(`${dbName} stats:`, databaseStats[dbName]);
      }
      
      setWordDatabases(databaseStats);
    } catch (error) {
      console.error('Failed to load word database stats:', error);
      // Set default empty stats
      setWordDatabases({
        'Kaggle -10000': { known: 0, total: 0 },
        'Gemini': { known: 0, total: 0 },
        'Oxford-3000': { known: 0, total: 0 },
        'Oxford-5000': { known: 0, total: 0 }
      });
    }
  };

  const formatStudyTime = (minutes) => {
    if (!minutes || minutes === 0) return '0 minutes';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    } else if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
  };

  // Prepare level pie chart data
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levelColors = {
    known: '#10b981',
    learning: '#f59e0b',
    unknown: '#3b82f6'
  };

  const prepareLevelData = (level) => {
    if (!stats) return [];
    const levelData = stats.levels?.[level] || { known: 0, total: 0 };
    const known = levelData.known || 0;
    const total = levelData.total || 0;
    const unknown = Math.max(0, total - known);

    return [
      { name: 'Known', value: known, color: levelColors.known },
      { name: 'Unknown', value: unknown, color: levelColors.unknown }
    ].filter(item => item.value > 0);
  };


  // Badge level thresholds
  const getLevelBadge = (knownWords) => {
    if (knownWords >= 16000) return { level: 'C2', name: 'Proficient', color: 'from-purple-500 to-pink-500', progress: 100 };
    if (knownWords >= 10000) return { level: 'C1', name: 'Advanced', color: 'from-indigo-500 to-purple-500', progress: (knownWords / 16000) * 100 };
    if (knownWords >= 7000) return { level: 'B2', name: 'Upper-Intermediate', color: 'from-blue-500 to-indigo-500', progress: (knownWords / 10000) * 100 };
    if (knownWords >= 4000) return { level: 'B1', name: 'Intermediate', color: 'from-green-500 to-blue-500', progress: (knownWords / 7000) * 100 };
    if (knownWords >= 2000) return { level: 'A2', name: 'Elementary', color: 'from-yellow-500 to-green-500', progress: (knownWords / 4000) * 100 };
    if (knownWords >= 1000) return { level: 'A1', name: 'Beginner', color: 'from-orange-500 to-yellow-500', progress: (knownWords / 2000) * 100 };
    return { level: 'Starter', name: 'Getting Started', color: 'from-gray-400 to-gray-500', progress: (knownWords / 1000) * 100 };
  };

  const currentBadge = getLevelBadge(stats?.wordStats?.known || 0);
  const totalStudyHours = Math.floor((stats?.totalStudyMinutes || 0) / 60);
  const studyBadges = badges ? Math.floor(totalStudyHours / 5) : 0; // Every 5 hours
  const wordBadges = badges ? Math.floor((stats?.wordStats?.known || 0) / 1000) : 0; // Every 1000 words

  return (
    <div className="dashboard-container">
      {/* Top Bar */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
      </div>

      {/* Main Content */}
      <div className="dashboard-content-wrapper">
        <div className="dashboard-content">

      {/* Top Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-card-header">
            <div className="stat-card-label">Total Words</div>
            <FaBook className="stat-card-icon" />
          </div>
          <div className="stat-card-value">
            {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.8 }} /> : (stats?.wordStats?.total || 0)}
          </div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-card-header">
            <div className="stat-card-label">Known Words</div>
            <FaArrowUp className="stat-card-icon" />
          </div>
          <div className="stat-card-value">
            {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.8 }} /> : (stats?.wordStats?.known || 0)}
          </div>
          <div className="stat-card-subtext">
            {loading ? <FaHourglassHalf style={{ fontSize: '0.85rem', opacity: 0.7 }} /> : (stats?.wordStats?.total ? `${Math.round((stats.wordStats.known / stats.wordStats.total) * 100)}% of total` : '0% of total')}
          </div>
        </div>

        <div className="stat-card stat-card-purple">
          <div className="stat-card-header">
            <div className="stat-card-label">Study Time</div>
            <FaClock className="stat-card-icon" />
          </div>
          <div className="stat-card-value-small">
            {loading ? <FaHourglassHalf style={{ fontSize: '1.5rem', opacity: 0.8 }} /> : formatStudyTime(stats?.totalStudyMinutes || 0)}
          </div>
        </div>
      </div>

      {/* Current Level Badge */}
      <div className="level-badge-card">
        <div className="level-badge-header">
          <div>
            <h2 className="level-badge-title">
              <FaAward className="level-badge-icon" />
              Your Current Level
            </h2>
            <p className="level-badge-subtitle">
              {loading ? <FaHourglassHalf style={{ fontSize: '0.9rem', opacity: 0.7 }} /> : `Based on ${stats?.wordStats?.known || 0} known words`}
            </p>
          </div>
          <div className={`level-badge-badge level-badge-${currentBadge.level.toLowerCase()}`}>
            {loading ? <FaHourglassHalf style={{ fontSize: '1.5rem', opacity: 0.8 }} /> : currentBadge.level}
          </div>
        </div>
        <div className="level-badge-progress-header">
          <span>{loading ? <FaHourglassHalf style={{ fontSize: '0.9rem', verticalAlign: 'middle' }} /> : currentBadge.name}</span>
          <span>{loading ? <FaHourglassHalf style={{ fontSize: '0.9rem', verticalAlign: 'middle' }} /> : `${Math.round(currentBadge.progress)}%`}</span>
        </div>
        <div className="level-badge-progress-bar">
          <div
            className={`level-badge-progress-fill level-badge-${currentBadge.level.toLowerCase()}`}
            style={{ width: loading ? '0%' : `${Math.min(currentBadge.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Badges Earned */}
      <div className="badges-card">
        <h2 className="section-title">Badges Earned</h2>
        <div className="badges-grid">
          <div className="badge-item badge-yellow">
            <div className="badge-emoji">🏆</div>
            <div className="badge-label">Level Badges</div>
            <div className="badge-value">
              {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].findIndex(l => l === currentBadge.level) + 1)}
            </div>
          </div>

          <div className="badge-item badge-green">
            <div className="badge-emoji">📚</div>
            <div className="badge-label">Word Badges</div>
            <div className="badge-value">{loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : wordBadges}</div>
            <div className="badge-subtext">Every 1,000 words</div>
          </div>

          <div className="badge-item badge-purple">
            <div className="badge-emoji">⏰</div>
            <div className="badge-label">Study Time</div>
            <div className="badge-value">{loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : studyBadges}</div>
            <div className="badge-subtext">Every 5 hours</div>
          </div>

          <div className="badge-item badge-blue">
            <div className="badge-emoji">🎯</div>
            <div className="badge-label">Total Badges</div>
            <div className="badge-value">
              {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : (wordBadges + studyBadges + (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].findIndex(l => l === currentBadge.level) + 1))}
            </div>
          </div>
        </div>
      </div>

      {/* Study Time by Module */}
      <div className="module-time-card">
        <h2 className="section-title">Study Time by Module</h2>
        <div className="module-time-grid">
          {loading ? (
            <div className="module-time-item">
              <div className="module-time-content">
                <FaBullseye className="module-time-icon" />
                <div>
                  <p className="module-time-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaHourglassHalf style={{ fontSize: '0.9rem', opacity: 0.7 }} />
                  </p>
                  <p className="module-time-value"><FaHourglassHalf style={{ fontSize: '1.25rem', opacity: 0.7 }} /></p>
                </div>
              </div>
            </div>
          ) : (
            Object.entries(stats?.studyTimeByModule || {}).map(([module, minutes]) => (
              <div key={module} className="module-time-item">
                <div className="module-time-content">
                  <FaBullseye className="module-time-icon" />
                  <div>
                    <p className="module-time-label">{module}</p>
                    <p className="module-time-value">{formatStudyTime(minutes)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Level Progress - 6 Pie Charts */}
      <div className="level-progress-card">
        <h2 className="section-title">Progress by Level</h2>
        <div className="level-charts-grid">
          {levels.map(level => {
            const data = prepareLevelData(level);
            const total = stats?.levels?.[level]?.total || 0;
            
            return (
              <div key={level} className="level-chart-item">
                <div className="level-chart-label">{level}</div>
                {loading ? (
                  <div className="level-chart-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaHourglassHalf style={{ fontSize: '1.5rem', opacity: 0.6 }} />
                  </div>
                ) : total > 0 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="level-chart-empty">No words</div>
                )}
                <div className="level-chart-stats">
                  {loading ? <FaHourglassHalf style={{ fontSize: '0.9rem', opacity: 0.6 }} /> : `${stats?.levels?.[level]?.known || 0} / ${total}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Known Total Chart - Word Databases */}
      <div className="known-total-card">
        <h2 className="section-title">Known Total</h2>
        {loading || !wordDatabases ? (
          <div className="known-total-chart-loading">
            <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.6 }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { 
                  name: 'Kaggle -10000', 
                  Known: wordDatabases['Kaggle -10000']?.known || 0, 
                  Total: (wordDatabases['Kaggle -10000']?.total || 0) - (wordDatabases['Kaggle -10000']?.known || 0)
                },
                { 
                  name: 'Gemini', 
                  Known: wordDatabases['Gemini']?.known || 0, 
                  Total: (wordDatabases['Gemini']?.total || 0) - (wordDatabases['Gemini']?.known || 0)
                },
                { 
                  name: 'Oxford-3000', 
                  Known: wordDatabases['Oxford-3000']?.known || 0, 
                  Total: (wordDatabases['Oxford-3000']?.total || 0) - (wordDatabases['Oxford-3000']?.known || 0)
                },
                { 
                  name: 'Oxford-5000', 
                  Known: wordDatabases['Oxford-5000']?.known || 0, 
                  Total: (wordDatabases['Oxford-5000']?.total || 0) - (wordDatabases['Oxford-5000']?.known || 0)
                }
              ]}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 'dataMax']} />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Known" stackId="a" fill="#10b981" />
              <Bar dataKey="Total" stackId="a" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

        </div>
        
        {/* Right Sidebar - Quick Stats */}
        <div className="dashboard-sidebar">
          <h3>Quick Stats</h3>
          <div className="sidebar-stats">
            <div className="sidebar-stat-card">
              <div className="sidebar-stat-label">Mastery Rate</div>
              <div className="sidebar-stat-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : 
                  stats?.wordStats?.total ? `${Math.round((stats.wordStats.known / stats.wordStats.total) * 100)}%` : '0%'}
              </div>
            </div>
            <div className="sidebar-stat-card">
              <div className="sidebar-stat-label">Study Streak</div>
              <div className="sidebar-stat-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : 
                  (stats?.studyStreak || 0)} days
              </div>
            </div>
            <div className="sidebar-stat-card">
              <div className="sidebar-stat-label">Current Level</div>
              <div className="sidebar-stat-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : 
                  currentBadge.level}
              </div>
            </div>
            <div className="sidebar-stat-card">
              <div className="sidebar-stat-label">Total Badges</div>
              <div className="sidebar-stat-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : 
                  (studyBadges + wordBadges)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

