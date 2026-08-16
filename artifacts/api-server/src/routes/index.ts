import { Router, type IRouter } from "express";
import healthRouter from "./health";
import physioRouter from "./physio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(physioRouter);

export default router;
