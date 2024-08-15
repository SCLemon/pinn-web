# -*- coding: utf-8 -*-
import json
import sys # 新增
import os # 新增

def gen_codes_meshes(param):
    '''

    inlet_mesh = Tessellation.from_stl(to_absolute_path('./stl_files') + '/aneurysm_inlet.stl', airtight=False)
    center = [-19.649354934692383, -50.0917854309082, 12.419385373592377]
    scale = 1
    inlet_mesh = normalize_mesh(inlet_mesh, center, scale)
    '''
    lines = []

    for meta in param['meshes']:
        if meta['type'] == 'mesh':
            line = '{0} = Tessellation.from_stl(point_path + \'/{1}\', airtight={2})'.format(meta['name'], meta['filename'], meta['airtight'])
            lines.append(line)

    if param['normalize']['do'] == 1:
        lines.append('')
        meta = param['normalize']
        line = 'center = {0}'.format(meta['center'])
        lines.append(line)
        line = 'scale = {0}'.format(meta['scale'])
        lines.append(line)

        for meta in param['meshes']:
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

def gen_codes_nodes(meta):  # 修改
    '''
    nodes = (ns.make_nodes() + normal_dot_vel.make_nodes() + [flow_net.make_node(name='flow_network')])
    '''
    equations = eval(meta['equations'])
    architectures = eval(meta['architectures'])
    
    tmp1 = []
    for ix in equations:
        tmp1.append('{0}.make_nodes()'.format(ix))
        
    tmp2 = []
    for ix in architectures:
        tmp2.append('{0}.make_node(name=\'{0}\')'.format(ix))
        
    line = '{0} = ({1} + [{2}])'.format(meta['name'], ' + '.join(tmp1), ', '.join(tmp2))
    return line

def gen_codes_constraint(meta):
    '''
    inlet = PointwiseBoundaryConstraint(nodes=nodes, geometry=inlet_mesh, outvar={'u':u, 'v':v, 'w':w}, batch_size=10)
    domain.add_constraint(inlet, 'inlet')
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

def gen_codes_monitor(meta):
    '''
    pressure_monitor = PointwiseMonitor(invar=inlet_mesh.sample_boundary(16), output_names=['p'], metrics={'pressure_drop': lambda var: torch.mean(var['p'])}, nodes=nodes)
    domain.add_monitor(pressure_monitor)
    '''
    lines = []
    tmp = []
    for ix in meta['arguments']:
        tmp.append('{0}={1}'.format(ix, meta[ix]))
    line = '{0} = {1}({2})'.format(meta['name'], meta['function'], ', '.join(tmp))
    lines.append(line)
    line = 'domain.add_monitor({0})'.format(meta['name'])
    lines.append(line)
    return lines

def gen_codes_validator(meta):
    lines = []
    return lines

def gen_codes_inferencer(meta):
    lines = []
    return lines

def gen_codes_manual(meta):
    lines = meta['codes']
    return lines

def gen_py_file(param_json, templ_py):
    # Load json
    param = None
    with open(param_json, 'r') as f:
        param = json.load(f)

    # Mesh block and normalization
    mesh_block = gen_codes_meshes(param)

    # Other blocks
    other_blocks = []
    for block in param['blocks']:

        other_blocks.append('')

        # Manual block
        if block['type'] == 'manual':
            lines = gen_codes_manual(block)
            other_blocks.extend(lines)

        # Equation block
        if block['type'] == 'equation':
            line = gen_codes_equation(block)
            other_blocks.append(line)

        # Architecture block
        if block['type'] == 'architecture':
            line = gen_codes_architecture(block)
            other_blocks.append(line)

        # Nodes block
        if block['type'] == 'nodes':
            line = gen_codes_nodes(block)
            other_blocks.append(line)

        # Constraint block
        if block['type'] == 'constraint':
            line = gen_codes_constraint(block)
            other_blocks.extend(line)

        # Validator block
        if block['type'] == 'validator':
            line = gen_codes_validator(block)
            other_blocks.extend(line)

        # Monitor block
        if block['type'] == 'monitor':
            line = gen_codes_monitor(block)
            other_blocks.extend(line)

        # Inferencer block
        if block['type'] == 'inferencer':
            line = gen_codes_inferencer(block)
            other_blocks.extend(line)

    # Load py template
    tmpl = None
    with open(templ_py, 'r') as f:
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

    return '\n'.join(codes)

if __name__ == '__main__':
    # 修改
    parameters = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template = os.path.join(script_dir, 'templ_py.py')

    py = gen_py_file(parameters, template)

    print(py)
