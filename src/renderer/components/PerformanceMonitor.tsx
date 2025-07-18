import React, { useState, useEffect } from 'react';
import { PerformanceStat, PerformanceReport } from '../../shared/types';

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  isVisible = false,
  onClose 
}) => {
  const [stats, setStats] = useState<Record<string, PerformanceStat>>({});
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isProfilingEnabled, setIsProfilingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 성능 통계 가져오기
  const fetchStats = async () => {
    try {
      const statistics = await window.electronAPI.getPerformanceStats();
      setStats(statistics || {});
    } catch (error) {
      console.error('Failed to fetch performance stats:', error);
    }
  };

  // 성능 리포트 가져오기
  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const performanceReport = await window.electronAPI.getPerformanceReport();
      setReport(performanceReport);
    } catch (error) {
      console.error('Failed to fetch performance report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 프로파일링 시작/중지
  const toggleProfiling = async () => {
    try {
      if (isProfilingEnabled) {
        const finalReport = await window.electronAPI.stopProfiling();
        setReport(finalReport);
        setIsProfilingEnabled(false);
      } else {
        await window.electronAPI.startProfiling('UI Performance Session');
        setIsProfilingEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle profiling:', error);
    }
  };

  // 데이터 초기화
  const clearData = async () => {
    try {
      await window.electronAPI.clearPerformanceData();
      setStats({});
      setReport(null);
    } catch (error) {
      console.error('Failed to clear performance data:', error);
    }
  };

  // 주기적으로 통계 업데이트
  useEffect(() => {
    if (!isVisible) return;

    fetchStats();
    const interval = setInterval(fetchStats, 2000); // 2초마다 업데이트

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="performance-monitor">
      <div className="performance-monitor-header">
        <h3>Performance Monitor</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="performance-monitor-controls">
        <button 
          className={`profiling-button ${isProfilingEnabled ? 'stop' : 'start'}`}
          onClick={toggleProfiling}
        >
          {isProfilingEnabled ? 'Stop Profiling' : 'Start Profiling'}
        </button>
        <button className="report-button" onClick={fetchReport} disabled={isLoading}>
          Generate Report
        </button>
        <button className="clear-button" onClick={clearData}>
          Clear Data
        </button>
      </div>

      <div className="performance-monitor-content">
        {/* 실시간 통계 */}
        <div className="stats-section">
          <h4>Live Statistics</h4>
          <div className="stats-grid">
            {Object.entries(stats).map(([name, stat]) => (
              <div key={name} className="stat-card">
                <div className="stat-name">{name}</div>
                <div className="stat-values">
                  <div className="stat-row">
                    <span className="stat-label">Count:</span>
                    <span className="stat-value">{stat.count}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Avg:</span>
                    <span className="stat-value">{stat.averageTime.toFixed(2)}ms</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Min/Max:</span>
                    <span className="stat-value">
                      {stat.minTime.toFixed(2)}ms / {stat.maxTime.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 성능 리포트 */}
        {report && (
          <div className="report-section">
            <h4>Performance Report</h4>
            <div className="report-summary">
              <p>Duration: {report.totalDuration.toFixed(2)}ms</p>
              <p>Start: {report.startTime}</p>
              <p>End: {report.endTime}</p>
            </div>

            {/* 느린 작업 */}
            {report.slowOperations.length > 0 && (
              <div className="slow-operations">
                <h5>Slow Operations (&gt;100ms)</h5>
                <ul>
                  {report.slowOperations.slice(0, 10).map((op, index) => (
                    <li key={index}>
                      <strong>{op.name}</strong>: {op.duration.toFixed(2)}ms
                      <div className="operation-path">{op.path.join(' → ')}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 권장사항 */}
            {report.recommendations.length > 0 && (
              <div className="recommendations">
                <h5>Recommendations</h5>
                <ul>
                  {report.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor;