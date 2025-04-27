import os
from pathlib import Path
import graphviz
from sqlalchemy.orm import class_mapper
from app.models import (
    User, Project, ProjectAssignment,
    ChatRoom, ChatMessage,
    Annotation, Base
)

def create_class_diagram():
    """Create a UML-style class diagram for the models, with attributes, methods, associations, and inheritance."""
    dot = graphviz.Digraph(comment='Class Diagram')
    dot.attr(rankdir='TB')
    dot.attr(size='8.3,11.7!')
    dot.attr(ratio='fill')
    dot.attr(nodesep='0.4')
    dot.attr(ranksep='0.5')
    dot.attr(fontsize='11')
    dot.attr(splines='polyline')
    dot.attr(overlap='false')
    dot.attr(concentrate='false')

    dot.attr('node',
             shape='record',
             style='filled',
             fillcolor='#f8f8f0',
             fontsize='11',
             margin='0.2,0.2',
             height='0.4')

    # List of models
    models = [
        User, Project, ProjectAssignment,
        ChatRoom, ChatMessage,
        Annotation
    ]

    # Draw class nodes (with attributes and methods)
    for model in models:
        mapper = class_mapper(model)
        class_name = mapper.class_.__name__
        attributes = []
        for column in mapper.columns:
            if column.name not in ['id', 'created_at', 'updated_at']:
                type_name = str(column.type).split('(')[0]
                attributes.append(f"+ {column.name}: {type_name}")
        attr_str = "\\l".join(attributes) + "\\l"
        label = f"{{{class_name}|{attr_str}}}"
        dot.node(class_name, label)

    # Draw inheritance arrows (solid line, hollow arrowhead)
    for model in models:
        for base in model.__bases__:
            if base is not Base and base in models:
                dot.edge(base.__name__, model.__name__, arrowhead='onormal', style='solid', label='')

    # Draw associations (solid line, with cardinality, no duplicates)
    seen = set()
    for model in models:
        mapper = class_mapper(model)
        class_name = mapper.class_.__name__
        for relationship in mapper.relationships:
            target = relationship.mapper.class_.__name__
            # Avoid duplicate edges
            key = tuple(sorted([class_name, target]))
            if key in seen:
                continue
            seen.add(key)
            # Cardinality
            relationship_type = {
                'MANYTOONE': '1..*',
                'ONETOMANY': '*..1',
                'MANYTOMANY': '*..*',
                'ONETOONE': '1..1'
            }.get(relationship.direction.name, '')
            dot.edge(class_name, target, label=relationship_type, arrowhead='none', style='solid')

    return dot

def main():
    output_dir = Path(__file__).parent / 'docs' / 'schema'
    output_dir.mkdir(parents=True, exist_ok=True)
    class_diagram = create_class_diagram()
    class_diagram.render(str(output_dir / 'class_diagram'), format='png', cleanup=True)
    print(f"Generated class diagram at {output_dir}/class_diagram.png")

if __name__ == '__main__':
    main() 