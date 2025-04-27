import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

import graphviz
from sqlalchemy.orm import class_mapper
from sqlalchemy_schemadisplay import create_schema_graph
from sqlalchemy import MetaData

from app.models import (
    User, Project, ProjectAssignment,
    ChatRoom, ChatMessage,
    Annotation, Base
)
from app.database import engine

def create_erd_diagram():
    """Create an Entity Relationship Diagram."""
    dot = graphviz.Digraph(comment='Entity Relationship Diagram')
    
    # Global graph settings
    dot.attr(rankdir='TB')
    dot.attr(size='8.3,11.7!')
    dot.attr(ratio='fill')
    dot.attr(nodesep='0.4')  # More compact horizontally
    dot.attr(ranksep='0.5')  # More compact vertically
    dot.attr(fontsize='11')
    dot.attr(splines='polyline')
    dot.attr(overlap='false')
    dot.attr(concentrate='false')

    # Node settings
    dot.attr('node',
             shape='record',
             style='filled',
             fillcolor='#f8f8f0',
             fontsize='11',
             margin='0.2,0.2',
             height='0.4')

    # Edge settings
    dot.attr('edge',
             fontsize='10',
             arrowsize='0.6',
             penwidth='0.8',
             labelfontsize='22',  # Larger for visibility
             labelfontcolor='indianred',  # Light red for visibility without being too heavy
             labelfontname='Arial Bold',
             decorate='false',
             len='1.5',
             labeldistance='3.0')  # Move label further from node for clarity

    # Group related models into subgraphs for better organization
    with dot.subgraph(name='cluster_users') as c:
        c.attr(label='Users')
        c.attr(style='rounded')
        c.attr(color='lightgray')
        c.attr(margin='15')
        c.node('User')
        c.node('ProjectAssignment')

    with dot.subgraph(name='cluster_projects') as c:
        c.attr(label='Projects')
        c.attr(style='rounded')
        c.attr(color='lightgray')
        c.attr(margin='15')
        c.node('Project')
        c.node('ChatRoom')

    with dot.subgraph(name='cluster_chat') as c:
        c.attr(label='Chat')
        c.attr(style='rounded')
        c.attr(color='lightgray')
        c.attr(margin='15')
        c.node('ChatMessage')

    with dot.subgraph(name='cluster_annotations') as c:
        c.attr(label='Annotations')
        c.attr(style='rounded')
        c.attr(color='lightgray')
        c.attr(margin='15')
        c.node('Annotation')

    # Process each model
    models = [
        User, Project, ProjectAssignment,
        ChatRoom, ChatMessage,
        Annotation
    ]

    for model in models:
        mapper = class_mapper(model)
        table_name = mapper.class_.__name__

        # Create node for the table
        attributes = []
        for column in mapper.columns:
            if column.name not in ['id', 'created_at', 'updated_at']:
                type_name = str(column.type).split('(')[0]
                attributes.append(f"+ {column.name}: {type_name}")

        label = f"{table_name}|" + "\\l".join(attributes) + "\\l"
        dot.node(table_name, label)

    # Draw relationships with headlabel/taillabel for cardinality (no duplicates)
    seen = set()
    for model in models:
        mapper = class_mapper(model)
        table_name = mapper.class_.__name__
        for relationship in mapper.relationships:
            if relationship.direction.name in ('MANYTOONE', 'ONETOONE'):
                target = relationship.mapper.class_.__name__
                key = tuple(sorted([table_name, target]))
                if key in seen:
                    continue
                seen.add(key)
                # Determine cardinality for each end
                if relationship.direction.name == 'MANYTOONE':
                    # Many (this side) to one (target)
                    taillabel = '*'
                    headlabel = '1'
                elif relationship.direction.name == 'ONETOONE':
                    taillabel = '1'
                    headlabel = '1'
                else:
                    taillabel = ''
                    headlabel = ''
                dot.edge(table_name, target, headlabel=headlabel, taillabel=taillabel, labeldistance='2.0', labelangle='0')

    return dot

def create_inheritance_diagram():
    """Create a diagram showing model inheritance relationships."""
    dot = graphviz.Digraph(comment='Model Inheritance')
    
    # Global graph settings
    dot.attr(rankdir='TB')
    dot.attr(size='8.3,11.7')  # A4 size in inches
    dot.attr(ratio='fill')  # Fill the page while maintaining aspect ratio
    dot.attr(nodesep='0.6')  # Further increased space between nodes
    dot.attr(ranksep='0.7')  # Further increased space between ranks
    dot.attr(fontsize='14')  # Larger font size
    dot.attr(splines='polyline')  # Use polyline for more flexible edge routing
    dot.attr(concentrate='true')  # Merge multiple edges
    
    # Node settings
    dot.attr('node',
             shape='box',
             style='filled',
             fillcolor='#e6f3ff',
             fontsize='14',
             margin='0.1,0.1')  # Reduce margins
    
    # Edge settings
    dot.attr('edge',
             fontsize='12',
             arrowsize='0.7',
             penwidth='1.0',  # Thinner lines
             labelfontsize='10',  # Smaller label font
             labelfontname='Arial',  # More readable font
             labeldistance='1.0',  # Keep labels closer to lines
             labelangle='0',  # Keep labels parallel to lines
             decorate='true',  # Add line to connect label to edge
             minlen='4')  # Further increased minimum edge length

    # Define inheritance relationships
    inheritance_map = {
        # No inheritance relationships in current models
    }

    for parent, children in inheritance_map.items():
        dot.node(parent, parent)
        for child in children:
            dot.node(child, child)
            dot.edge(parent, child, style='dashed', label='inherits')

    return dot

def generate_erd():
    # Create the graph
    metadata = MetaData()
    metadata.reflect(bind=engine)
    graph = create_schema_graph(
        metadata=metadata,
        show_datatypes=True,
        show_indexes=True,
        rankdir='TB',
        concentrate=True
    )
    # Write to file
    output_path = os.path.join(os.path.dirname(__file__), 'docs', 'erd.png')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    graph.write_png(output_path)
    print(f"ERD generated at: {output_path}")

def main():
    """Generate schema visualizations."""
    # Create output directory if it doesn't exist
    output_dir = Path(__file__).parent / 'docs' / 'schema'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate ERD diagram (custom, with clear relationships)
    erd_diagram = create_erd_diagram()
    erd_diagram.render(str(output_dir / 'erd'), format='png', cleanup=True)
    print(f"Generated ERD diagram at {output_dir}/erd.png")

if __name__ == '__main__':
    main() 