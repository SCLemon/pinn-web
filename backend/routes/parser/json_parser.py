# -*- coding: utf-8 -*-
import json
import sys # 新增
import os # 新增

def gen_codes_meshes(proj):
    '''
    inlet_mesh = Tessellation.from_stl('aneurysm_inlet.stl', airtight=False)
    center = [-19.649354934692383, -50.0917854309082, 12.419385373592377]
    scale = 1
    inlet_mesh = normalize_mesh(inlet_mesh, center, scale)
    '''
    lines = []

    for meta in proj['meshes']:
        if meta['type'] == 'mesh':
            line = '{0} = Tessellation.from_stl({1}, airtight={2})'.format(meta['name'], meta['filename'], meta['airtight'])
            lines.append(line)

    if proj['normalize']['do'] == 1:
        lines.append('')
        meta = proj['normalize']
        line = 'center = {0}'.format(meta['center'])
        lines.append(line)
        line = 'scale = {0}'.format(meta['scale'])
        lines.append(line)

        for meta in proj['meshes']:
            if meta['type'] == 'mesh':
                line = '{0} = normalize_mesh({0}, center, scale)'.format(meta['name'])
                lines.append(line)

    return lines

def gen_codes_equation(meta):
    '''
    ns = NavierStokes(nu=nu * scale, rho=1.0, dim=3, time=False)
    '''
    tmp = []
    for ix in meta['arguments']:
        tmp.append('{0}={1}'.format(ix, meta[ix]))
        line = '{0} = {1}({2})'.format(meta['name'], meta['function'], ', '.join(tmp))
    return line

def gen_codes_architecture(meta):
    '''
    flow_net = instantiate_arch(input_keys=[Key('x'), Key('y'), Key('z')], output_keys=[Key('u'), Key('v'), Key('w'), Key('p')])
    '''
    tmp = []
    for ix in meta['arguments']:
        if ix in ['input_keys', 'output_keys']:
            tmp1 = []
            for jx in eval(meta[ix]):
                tmp1.append("Key('{0}')".format(jx))
            tmp.append('{0}=[{1}]'.format(ix, ', '.join(tmp1)))
        else:
            tmp.append('{0}={1}'.format(ix, meta[ix]))
    line = '{0} = {1}({2})'.format(meta['name'], meta['function'], ', '.join(tmp))
    return line

def gen_codes_nodes(meta):
    '''
    nodes = (ns.make_nodes() + normal_dot_vel.make_nodes() + [flow_net.make_node(name='flow_network')])
    '''
    tmp1 = []
    for ix in meta['equations']:
        tmp1.append('{0}.make_nodes()'.format(ix))
    tmp2 = []
    for ix in meta['architectures']:
        tmp2.append('{0}.make_node(name=\'{0}\')'.format(ix))
    line = '{0} = ({1} + [{2}])'.format(meta['name'], ' + '.join(tmp1), ', '.join(tmp2))
    return line

def gen_codes_constraint(meta):
    '''
    inlet = PointwiseBoundaryConstraint(nodes=nodes, geometry=inlet_mesh, outvar={'u':u, 'v':v, 'w':w}, batch_size=10)
    domain.add_constraint(inlet, "inlet")
    '''
    lines = []
    tmp = []
    for ix in meta['arguments']:
        tmp.append('{0}={1}'.format(ix, meta[ix]))
    line = '{0} = {1}({2})'.format(meta['name'], meta['function'], ', '.join(tmp))
    lines.append(line)
    line = 'domain.add_constraint({0}, \'{0}\')'.format(meta['name'])
    lines.append(line)
    return lines

def gen_codes_manual(meta):
    lines = meta['codes']
    return lines


if __name__ == '__main__':

    # Load json
    proj = None
    json_file = sys.argv[1] #新增

    with open(json_file, 'r') as f: #新增
        proj = json.load(f)

    # Mesh block and normalization
    mesh_block = gen_codes_meshes(proj)

    # Other blocks
    other_blocks = []
    for block in proj['blocks']:

        # Equation block
        if block['type'] == 'equation':
            line = gen_codes_equation(block)
            other_blocks.append('')
            other_blocks.append(line)

        # Architecture block
        if block['type'] == 'architecture':
            line = gen_codes_architecture(block)
            other_blocks.append('')
            other_blocks.append(line)

        # Nodes block
        if block['type'] == 'nodes':
            line = gen_codes_nodes(block)
            other_blocks.append('')
            other_blocks.append(line)

        # Constraint block
        if block['type'] == 'constraint':
            line = gen_codes_constraint(block)
            other_blocks.append('')
            other_blocks.extend(line)

        # Manual block
        if block['type'] == 'manual':
            lines = gen_codes_manual(block)
            other_blocks.append('')
            other_blocks.extend(lines)

    # Load template
    tmpl = None

    # 獲取當前腳本的目錄 <-- 新增
    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(script_dir, 'pinn_template.py')
    with open(file_path, 'r') as f:
        tmpl = [x.rstrip() for x in f.readlines()]

    # Find insert places
    mesh_block_i = 0
    other_blocks_i = 0
    for i, ix in enumerate(tmpl):
        if ix.strip() == '<<MESH_BLOCK>>':
            mesh_block_i = i
        if ix.strip() == '<<OTHER_BLOCKS>>':
            other_blocks_i = i

    # Insert codes
    codes = []
    for i in range(0, mesh_block_i):
        codes.append(tmpl[i])
    for ix in mesh_block:
        codes.append('    ' + ix)
    for i in range(mesh_block_i+1, other_blocks_i):
        codes.append(tmpl[i])
    for ix in other_blocks:
        codes.append('    ' + ix)
    for i in range(other_blocks_i+1, len(tmpl)):
        codes.append(tmpl[i])

    # Show result
    print('\n'.join(codes))
