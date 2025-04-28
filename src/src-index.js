import api, { route } from "@forge/api";
import { Buffer } from "buffer";
import Resolver from "@forge/resolver"; 
import path from 'path';
import fs from 'fs'

// Destination config
const DEST_BASE_URL = "https://divyaselvam1405.atlassian.net/wiki/";
const DEST_EMAIL =
const DEST_API_TOKEN = 
const AUTH_HEADER = {
  Authorization: `Basic ${Buffer.from(`${DEST_EMAIL}:${DEST_API_TOKEN}`).toString("base64")}`,
};

const headers = {
  "Content-Type": "application/json",
};

async function getAllSpaces() {
  let spaces = [];
  let fetchMore = true;

  while (fetchMore) {
    try {
      const res = await api.asUser().requestConfluence(
        route`/wiki/rest/api/space?limit=1000`, { headers: headers }
      );
      const json = await res.json();
      spaces = spaces.concat(json.results);

      fetchMore = json._links.next != null;
    } catch (error) {
      console.error('Error fetching spaces:', error);
      break;  // Stop if there is an error
    }
  }

  const filteredSpaces = spaces.filter(space => space.type !== "personal");
  console.log('getAllSpaces result:', filteredSpaces);  // Log the result
  return filteredSpaces;
}

async function getAllDestSpaces() {
  let spaces = [];
  let fetchMore = true;

  while (fetchMore) {
    try {
      const res = await fetch(`${DEST_BASE_URL}/rest/api/space?limit=1000`, { 
        headers: AUTH_HEADER 
      });

      if (!res.ok) {
        throw new Error(`Unable to fetch spaces. Status Code: ${res.status}`);
      }

      const JsonResponse = await res.json();
      spaces = spaces.concat(JsonResponse.results);
      fetchMore = JsonResponse._links.next != null;
    } catch (error) {
      console.error('Error fetching destination spaces:', error);
      break;  // Stop if there is an error
    }
  }

  const result = new Set(spaces.map(space => space.key));  // Convert array to Set for fast lookup
  console.log('getAllDestSpaces result:', result);  // Log the result
  return result;
}


async function getSpaceDetails(spaceKey) {
  try {
    const res = await api.asUser().requestConfluence(
      route`/wiki/rest/api/space/${spaceKey}`, { headers: headers }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch space details for ${spaceKey}: ${res.statusText}`);
    }

    const spaceDetails = await res.json();
    console.log('getSpaceDetails result:', spaceDetails);  // Log the result
    return spaceDetails;
  } catch (error) {
    console.error('Error fetching space details:', error.message);
    return null;
  }
}

async function createSpace(spaceKey, name, description) {
  const payload = {
    key: spaceKey,
    name: name,
    description: { plain: description },
    type: "global",  
  };

  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/space`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { ...headers, ...AUTH_HEADER },
    });

    if (!res.ok) {
      throw new Error(`Failed to create space ${name}: ${res.statusText}`);
    }

    const space = await res.json();
    console.log(`✅ Created space: ${name} → Key: ${space.key}`);
    return space.key;
  } catch (error) {
    console.error(`❌ Error creating space ${name}:`, error.message);
    return null;
  }
}

async function getPages(spaceKey) {
  try {
    console.log('Space Key:', spaceKey);

    // Construct the route for fetching pages
    const url = route`/wiki/rest/api/content?spaceKey=${spaceKey}&expand=body.storage,ancestors&limit=100`;

    console.log('Request URL for pages:', url.value_); // value_ gives clean string in logs

    // Make the request to Confluence API properly
    const response = await api.asUser().requestConfluence(url, { headers });

    // Parse the response JSON
    const data = await response.json();

    console.log('Response data:', data);

    // Return the pages array
    return data.results;
  } catch (error) {
    console.error('Error fetching pages:', error);
    return null;
  }
}

async function createPage(spaceKey, title, body, parentId = null) {
  const payload = {
    type: 'page',
    title,
    space: { key: spaceKey },
    body: {
      storage: {
        value: body,
        representation: 'storage',
      },
    },
  };

  if (parentId) {
    payload.ancestors = [{ id: parentId }];
  }

  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/content`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { ...headers, ...AUTH_HEADER },
    });

    if (!res.ok) {
      const errorText = await res.text();  // Important: capture full error response
      console.error(`❌ Failed to create page "${title}":`, res.status, res.statusText);
      console.error('Server response:', errorText);
      return null;
    }

    const pageId = (await res.json()).id;
    console.log(`✅ Created page: ${title} → ID: ${pageId}`);
    return pageId;
  } catch (error) {
    console.error(`🚨 Error creating page "${title}":`, error);
    return null;
  }
}

async function getAttachments(pageId) {
  try {
    console.log("Attachments fetching....")
    const res = await api.asUser().requestConfluence(
      route`/wiki/rest/api/content/${pageId}/child/attachment`, { headers}
    );
    const attachments = await res.json();
    console.log('getAttachments result:', attachments);  
    return attachments.results || [];
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
}
async function downloadAttachment(attachmentId) {
  try {
    // Step 1: Get attachment info
    const DEST_EMAIL_1="divya.s@cprime.com"
    const DEST_API_TOKEN_1=
    const AUTH_HEADER_1={
      Authorization: `Basic ${Buffer.from(`${DEST_EMAIL_1}:${DEST_API_TOKEN_1}`).toString("base64")}`
    }
    const res = await api.asUser().requestConfluence(
      route`/wiki/rest/api/content/${attachmentId}`,
      { headers }
    );
    const json = await res.json();

    const downloadLink = json._links.download; // Example: /download/attachments/12345/filename.png
  
    // Step 2: Download the attachment
    const downloadRes = await fetch(
     `https://divyacprime.atlassian.net/wiki${downloadLink}`,
      {
        headers: {
          Accept: 'application/octet-stream',
          ...AUTH_HEADER_1 
        },
      }
    );

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(__dirname, 'images', `${attachmentId}`);
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ File saved to ${filePath}`);
    return buffer;
  } catch (error) {
    console.error('❌ Error downloading attachment:', error);
    return null;
  }
}

async function uploadAttachment(pageId, fileBytes, filename) {
  const formData = new FormData();
  formData.append("file", new Blob([fileBytes]), filename);

  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/content/${pageId}/child/attachment`, {
      method: 'POST',
      body: formData,
      headers: { "X-Atlassian-Token": "no-check", ...AUTH_HEADER },
    });

    if (res.ok) {
      console.log(`📌 Uploaded attachment: ${filename}`);
    } else {
      throw new Error(`Failed to upload attachment ${filename}: ${res.statusText}`);
    }
  } catch (error) {
    console.error('Error uploading attachment:', error);
  }
}

// Step 6: Handle labels (add labels to pages)
async function getLabels(pageId) {
  const res = await api.asUser().requestConfluence(
    route`/wiki/rest/api/content/${pageId}/label`, { headers: AUTH_HEADER }
  );
  const json = await res.json();
  return json.results.map(label => label.name);
}

async function addLabelsToPage(pageId, labels) {
  const payload = labels.map(label => ({ prefix: "global", name: label }));
  const res = await fetch(`${DEST_BASE_URL}/rest/api/content/${pageId}/label`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...headers, ...AUTH_HEADER },
  });

  if (res.ok) {
    console.log(`✅ Labels added to page ID ${pageId}`);
  } else {
    console.error(`❌ Failed to add labels to page ID ${pageId}: ${res.statusText}`);
  }
}

async function getComments(pageId) {
  try {
    const res = await api.asUser().requestConfluence(
      route`/wiki/rest/api/content/${pageId}/child/comment?expand=body.storage`, { headers }
    );
    const comments = await res.json();
    console.log('getComments result:', comments);  // Log the result
    return comments.results || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}


async function createComment(pageId, commentBody) {
  
  console.log(pageId,commentBody)
  console.log(`${pageId}`)
  const payload = {
    type: 'comment',
    body: {
      storage: {
        value: commentBody,
        representation: 'storage',
      }
    },
      container: {
        "id": `${pageId}`,
        "type": "page"
    },
  };

  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/content`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { ...headers, ...AUTH_HEADER },
    });

    if (res.ok) {
      const comment = await res.json();
      console.log(`Created comment: ${comment.body.storage.value}`);
      return comment.id;
    }
     else {
      throw new Error(`Failed to create comment: ${res.statusText}.Response: ${errorDetail}`);
    }
  } catch (error) {
    console.error('Error creating comment:', error.message);
    return null;
  }
}

export async function runMigration() {
  const spaces = await getAllSpaces(); 
  const existingSpaceKeys = await getAllDestSpaces(); 

  for (const space of spaces) {
    const { key: spaceKey } = space;

    const spaceDetails = await getSpaceDetails(spaceKey); 
    if (!spaceDetails) continue;

    const { name, description } = spaceDetails;
    if (!existingSpaceKeys.has(spaceKey)) {
      await createSpace(spaceKey, name, description);
    }

    console.log(getPages(spaceKey))

    const pages = await getPages(spaceKey); 
    const idMap = {};

    for (const page of pages) {
      if (!page || !page.id) {
        console.error('Page data is invalid or missing ID, skipping...');
        continue; 
      }
      const { id: oldId, title, body, ancestors } = page;
      const parentId = ancestors?.length ? idMap[ancestors[ancestors.length - 1].id] : null;
      console.log(parentId)
      
      const newPageId = await createPage(spaceKey, title, body.storage.value, parentId);  // Create page on destination
      if (newPageId) {
        idMap[oldId] = newPageId;

        const labels = await getLabels(oldId); 
        await addLabelsToPage(newPageId, labels);

        const attachments = await getAttachments(oldId);  // Get attachments from source
        for (const attachment of attachments) {
          const fileBytes = await downloadAttachment(attachment.id,oldId);  // Download attachment
          await uploadAttachment(newPageId, fileBytes, attachment.title);  // Upload attachment to destination
        }
        const comments = await getComments(oldId);  // Get comments from source
        for (const comment of comments) {
          const commentBody = comment.body.storage.value;
          await createComment(newPageId, commentBody);  // Create comment on destination page
        }
      }
    }
  }
}

const resolver = new Resolver(); // ✅

resolver.define('runMigration', runMigration);

export const handler = resolver.getDefinitions();
