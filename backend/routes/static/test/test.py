import os
import warnings

import torch
import numpy as np
from sympy import Symbol

import modulus.sym
from modulus.sym.hydra import instantiate_arch
from modulus.sym.hydra import ModulusConfig
from modulus.sym.solver import Solver
from modulus.sym.domain import Domain
from modulus.sym.domain.constraint import PointwiseBoundaryConstraint
from modulus.sym.domain.constraint import PointwiseInteriorConstraint
from modulus.sym.domain.constraint import IntegralBoundaryConstraint
from modulus.sym.domain.validator import PointwiseValidator
from modulus.sym.domain.monitor import PointwiseMonitor
from modulus.sym.key import Key
from modulus.sym.eq.pdes.navier_stokes import NavierStokes
from modulus.sym.eq.pdes.basic import NormalDotVec
from modulus.sym.models.fully_connected import FullyConnectedArch
from modulus.sym.utils.io import csv_to_dict
from modulus.sym.geometry.tessellation import Tessellation


@modulus.sym.main(config_path="conf", config_name="config")
def run(cfg: ModulusConfig) -> None:

    # normalize meshes
    def normalize_mesh(mesh, center, scale):
        mesh = mesh.translate([-c for c in center])
        mesh = mesh.scale(scale)
        return mesh

    domain = Domain()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    original_path = os.path.join(base_dir, 'stl_files')
    original_path_arr = original_path.split('/')
    start_index = 2
    end_index = 4
    original_path_arr = original_path_arr[:start_index] + original_path_arr[end_index:]
    point_path = '/'.join(original_path_arr)

    inlet_mesh = Tessellation.from_stl(
        point_path + "/aneurysm_inlet.stl", airtight=False
    )
    outlet_mesh = Tessellation.from_stl(
        point_path + "/aneurysm_outlet.stl", airtight=False
    )
    noslip_mesh = Tessellation.from_stl(
        point_path + "/aneurysm_noslip.stl", airtight=False
    )
    integral_mesh = Tessellation.from_stl(
        point_path + "/aneurysm_integral.stl", airtight=False
    )
    interior_mesh = Tessellation.from_stl(
        point_path + "/aneurysm_closed.stl", airtight=True
    )
    
    center = [-18.40381048596882, -50.285383353981196, 12.848136936899031]
    scale = 0.4
    inlet_mesh = normalize_mesh(inlet_mesh, center, scale)
    outlet_mesh = normalize_mesh(outlet_mesh, center, scale)
    noslip_mesh = normalize_mesh(noslip_mesh, center, scale)
    interior_mesh = normalize_mesh(interior_mesh, center, scale)
    integral_mesh = normalize_mesh(integral_mesh, center, scale)
    
    nu = 0.025
    inlet_vel = 1.5
    inlet_normal = (0.8526, -0.428, 0.299)
    inlet_area = 21.1284 * (scale**2)
    inlet_center = (-4.24298030045776, 4.082857101816247, -4.637790193399717)
    inlet_radius = np.sqrt(inlet_area / np.pi)
    outlet_normal = (0.33179, 0.43424, 0.83747)
    outlet_area = 12.0773 * (scale**2)
    outlet_radius = np.sqrt(outlet_area / np.pi)
    
    ns = NavierStokes(nu=nu*scale, rho=1.0, dim=3, time=False)
    
    normal_dot_vel = NormalDotVec(vec=['u', 'v', 'w'])
    
    flow_net = FullyConnectedArch(input_keys=[Key('x'), Key('y'), Key('z')], output_keys=[Key('u'), Key('v'), Key('w'), Key('p')], layer_size=512, nr_layers=6, adaptive_activations=False)
    
    nodes = (ns.make_nodes() + normal_dot_vel.make_nodes() + [flow_net.make_node(name='flow_net')])
    
    # inlet velocity profile
    from sympy import sqrt, Max
    def circular_parabola(x, y, z, center, normal, radius, max_vel):
        centered_x = x - center[0]
        centered_y = y - center[1]
        centered_z = z - center[2]
        distance = sqrt(centered_x**2 + centered_y**2 + centered_z**2)
        parabola = max_vel * Max((1 - (distance / radius) ** 2), 0)
        return normal[0] * parabola, normal[1] * parabola, normal[2] * parabola
    
    u, v, w = circular_parabola(
        Symbol('x'),
        Symbol('y'),
        Symbol('z'),
        center=inlet_center,
        normal=inlet_normal,
        radius=inlet_radius,
        max_vel=inlet_vel,
    )
    
    inlet = PointwiseBoundaryConstraint(nodes=nodes, geometry=inlet_mesh, outvar={'u':u, 'v':v, 'w':w}, batch_size=1100, criteria=None, lambda_weighting=None)
    domain.add_constraint(inlet, 'inlet')
    
    outlet = PointwiseBoundaryConstraint(nodes=nodes, geometry=outlet_mesh, outvar={'p':0}, batch_size=650, criteria=None, lambda_weighting=None)
    domain.add_constraint(outlet, 'outlet')
    
    no_slip = PointwiseBoundaryConstraint(nodes=nodes, geometry=noslip_mesh, outvar={'u':0, 'v':0, 'w':0}, batch_size=5200, criteria=None, lambda_weighting=None)
    domain.add_constraint(no_slip, 'no_slip')
    
    interior = PointwiseInteriorConstraint(nodes=nodes, geometry=interior_mesh, outvar={'continuity':0, 'momentum_x':0, 'momentum_y':0, 'momentum_z':0}, batch_size=6000, bounds=None, criteria=None, lambda_weighting=None)
    domain.add_constraint(interior, 'interior')
    
    integral_continuity = IntegralBoundaryConstraint(nodes=nodes, geometry=outlet_mesh, outvar={'normal_dot_vel':2.540}, batch_size=1, integral_batch_size=310, criteria=None, lambda_weighting={'normal_dot_vel':0.1})
    domain.add_constraint(integral_continuity, 'integral_continuity')
    
    integral_continuity = IntegralBoundaryConstraint(nodes=nodes, geometry=integral_mesh, outvar={'normal_dot_vel':-2.540}, batch_size=1, integral_batch_size=310, criteria=None, lambda_weighting={'normal_dot_vel':0.1})
    domain.add_constraint(integral_continuity, 'integral_continuity')
    
    pressure_monitor = PointwiseMonitor(invar=inlet_mesh.sample_boundary(16), output_names=['p'], metrics={'pressure_drop': lambda var: torch.mean(var['p'])}, nodes=nodes, requires_grad=False)
    domain.add_constraint(pressure_monitor, 'pressure_monitor')

    # make solver
    slv = Solver(cfg, domain)

    # start solver
    slv.solve()

if __name__ == "__main__":
    run()
