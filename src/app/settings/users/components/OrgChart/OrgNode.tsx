import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Agent, getRoleDisplayName, getRoleColorClass, getRoleIcon } from '../../utils/roleHelpers';
import { HierarchyNode } from '../../utils/hierarchyBuilder';
import styles from '../../styles/OrgChart.module.css';

interface OrgNodeProps {
  node: HierarchyNode;
  onAgentClick: (agentId: number) => void;
  onMouseEnter: (agent: Agent, event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onMouseMove: (event: React.MouseEvent) => void;
}

export const OrgNode: React.FC<OrgNodeProps> = ({
  node,
  onAgentClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
}) => {
  const hasChildren = node.children.length > 0;

  return (
    <div className={styles.orgNode}>
      {/* Employee Card */}
      <div className={styles.orgCardWrapper}>
        <div
          className={`${styles.orgEmployeeCard} ${styles[`role${getRoleColorClass(node.agent.role)}`]}`}
          data-role={node.agent.role}
          onClick={() => onAgentClick(node.agent.id)}
          onMouseEnter={(e) => onMouseEnter(node.agent, e)}
          onMouseLeave={onMouseLeave}
          onMouseMove={onMouseMove}
        >
          <div className={styles.orgAvatar}>
            <FontAwesomeIcon icon={getRoleIcon(node.agent.role)} />
          </div>
          <div className={styles.orgInfo}>
            <div className={styles.orgNameBadge}>
              <span className={styles.orgName}>{node.agent.name.toUpperCase()}</span>
            </div>
            <div className={styles.orgPosition}>{getRoleDisplayName(node.agent.role)}</div>
          </div>
        </div>
      </div>

      {/* Children Section */}
      {hasChildren && (
        <div className={styles.orgChildren}>
          {/* Main vertical line from parent */}
          <div className={styles.orgMainLine}></div>

          {/* Children container with connectors */}
          <div className={styles.orgChildrenContainer}>
            {/* Horizontal connector line */}
            {node.children.length > 1 && <div className={styles.orgHorizontalConnector}></div>}

            {/* Children with vertical lines */}
            <div className={styles.orgChildrenGrid}>
              {node.children.map((childNode) => (
                <div key={childNode.agent.id} className={styles.orgChildWrapper}>
                  {/* Vertical line to child */}
                  <div className={styles.orgChildVerticalLine}></div>
                  {/* Child node */}
                  <OrgNode
                    node={childNode}
                    onAgentClick={onAgentClick}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onMouseMove={onMouseMove}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
