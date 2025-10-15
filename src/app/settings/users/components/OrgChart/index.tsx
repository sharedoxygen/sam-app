import React from 'react';
import { Agent } from '../../utils/roleHelpers';
import { buildHierarchy } from '../../utils/hierarchyBuilder';
import { OrgNode } from './OrgNode';
import styles from '../../styles/OrgChart.module.css';

interface OrgChartProps {
  agents: Agent[];
  onAgentClick: (agentId: number) => void;
  onMouseEnter: (agent: Agent, event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onMouseMove: (event: React.MouseEvent) => void;
}

export const OrgChart: React.FC<OrgChartProps> = ({
  agents,
  onAgentClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
}) => {
  const hierarchyRoots = buildHierarchy(agents);

  return (
    <div className={styles.hierarchyView}>
      {hierarchyRoots.length > 0 ? (
        <div className={styles.orgChartContainer}>
          {hierarchyRoots.map((rootNode) => (
            <OrgNode
              key={rootNode.agent.id}
              node={rootNode}
              onAgentClick={onAgentClick}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onMouseMove={onMouseMove}
            />
          ))}
        </div>
      ) : (
        <p className={styles.noDataMessage}>No agents found matching your criteria.</p>
      )}
    </div>
  );
};
