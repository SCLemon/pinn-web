import os
import modulus.sym
from modulus.sym.hydra import to_absolute_path
from modulus.sym.hydra import instantiate_arch
from modulus.sym.hydra import ModulusConfig
from modulus.sym.geometry.tessellation import Tessellation
from modulus.sym.solver import Solver
from modulus.sym.domain import Domain
from modulus.sym.domain.constraint import PointwiseBoundaryConstraint
from modulus.sym.domain.constraint import PointwiseInteriorConstraint
from modulus.sym.domain.constraint import IntegralBoundaryConstraint
from modulus.sym.domain.validator import PointwiseValidator
from modulus.sym.domain.monitor import PointwiseMonitor
from modulus.sym.domain.inferencer import PointwiseInferencer
from modulus.sym.key import Key
from modulus.sym.eq.pdes.navier_stokes import NavierStokes
from modulus.sym.eq.pdes.basic import NormalDotVec
from modulus.sym.models.fully_connected import FullyConnectedArch
from modulus.sym.utils.io import csv_to_dict
from modulus.sym.utils.io import ValidatorPlotter
from modulus.sym.utils.io import InferencerPlotter


@modulus.sym.main(config_path='conf', config_name='config')
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
    
    <<MESH_BLOCK>>
    <<OTHER_BLOCKS>>

    # make solver
    slv = Solver(cfg, domain)

    # start solver
    slv.solve()

if __name__ == "__main__":
    run()
