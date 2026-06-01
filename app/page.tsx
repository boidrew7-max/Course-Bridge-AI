import PlannerClient from "./PlannerClient";
import {
  getArticulationOptions,
  loadArticulationData,
} from "../lib/articulationData";

export default function Home() {
  const requirements = loadArticulationData();
  const options = getArticulationOptions(requirements);

  return <PlannerClient requirements={requirements} options={options} />;
}
