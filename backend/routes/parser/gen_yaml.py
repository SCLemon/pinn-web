# -*- coding: utf-8 -*-
import json
import sys # 新增
import os # 新增

def gen_yaml_file(param_json, templ_yaml):
    # Load json
    param = None
    with open(param_json, 'r') as f:
        param = json.load(f)

    # Load yaml template
    tmpl = None
    with open(templ_yaml, 'r') as f:
        tmpl = [x.rstrip() for x in f.readlines()]

    for ix in param['hydra'].keys():
        if isinstance(param['hydra'][ix], str):
            old = '<<' + ix + '>>'
            new = param['hydra'][ix]
            for j, jx in enumerate(tmpl):
                if old in jx:
                    tmpl[j] = jx.replace(old, new)
        if isinstance(param['hydra'][ix], dict):
            for jx in param['hydra'][ix].keys():
                old = '<<' + jx + '>>'
                new = param['hydra'][ix][jx]
                for k, kx in enumerate(tmpl):
                    if old in kx:
                        tmpl[k] = kx.replace(old, new)

    return '\n'.join(tmpl)

if __name__ == '__main__':

    parameters = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template = os.path.join(script_dir, 'templ_yaml.yaml')

    yaml = gen_yaml_file(parameters, template)

    print(yaml)
