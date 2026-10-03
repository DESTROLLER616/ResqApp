use serde::{Deserialize, Serialize};

pub const ENVIRONMENTS_FILE: &str = "environments.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentVariable {
    pub id: String,
    pub key: String,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub variables: Vec<EnvironmentVariable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentsFile {
    pub version: u32,
    #[serde(default)]
    pub environments: Vec<Environment>,
}

impl Default for EnvironmentsFile {
    fn default() -> Self {
        Self {
            version: 1,
            environments: Vec::new(),
        }
    }
}

impl EnvironmentsFile {
    /// Secret values stay in the device snapshot, never in the project file.
    pub fn without_secret_values(&self) -> Self {
        let mut file = self.clone();
        for environment in &mut file.environments {
            for variable in &mut environment.variables {
                if variable.secret {
                    variable.value.clear();
                }
            }
        }
        file
    }
}
