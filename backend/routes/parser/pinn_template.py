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

    <<MESH_BLOCK>>
    <<OTHER_BLOCKS>>

    # make solver
    slv = Solver(cfg, domain)

    # start solver
    slv.solve()

if __name__ == "__main__":
    run()
